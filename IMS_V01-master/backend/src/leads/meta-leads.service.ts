import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { LeadsService } from './leads.service';
import { mapLeadFields } from './lead-field-mapper';

const LEAD_FIELDS =
  'id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,platform,is_organic';

/**
 * Meta (Facebook / Instagram) Lead Ads integration.
 *
 * .env:
 *   META_VERIFY_TOKEN        any random string; type the same value in the Meta webhook setup
 *   META_APP_SECRET          App secret (used to verify X-Hub-Signature-256)
 *   META_PAGE_ACCESS_TOKEN   long-lived Page access token with leads_retrieval permission
 *   META_GRAPH_VERSION       optional, default v23.0
 *   META_FORM_IDS            optional, comma-separated form IDs for "Sync from Meta"
 */
@Injectable()
export class MetaLeadsService {
  private readonly logger = new Logger(MetaLeadsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly leadsService: LeadsService,
  ) {}

  private get graphBase() {
    return `https://graph.facebook.com/${this.config.get<string>('META_GRAPH_VERSION') || 'v23.0'}`;
  }

  private get token(): string | null {
    return this.config.get<string>('META_PAGE_ACCESS_TOKEN') || null;
  }

  status() {
    return {
      webhook_ready: !!(this.config.get('META_VERIFY_TOKEN') && this.config.get('META_APP_SECRET') && this.token),
      has_verify_token: !!this.config.get('META_VERIFY_TOKEN'),
      has_app_secret: !!this.config.get('META_APP_SECRET'),
      has_page_token: !!this.token,
      form_ids: this.formIds(),
    };
  }

  private formIds(): string[] {
    return (this.config.get<string>('META_FORM_IDS') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /** GET handshake when the webhook is added in the Meta App dashboard. */
  verifySubscription(mode: string, token: string, challenge: string): string | null {
    const expected = this.config.get<string>('META_VERIFY_TOKEN');
    if (mode === 'subscribe' && expected && token === expected) return challenge;
    return null;
  }

  /** Checks X-Hub-Signature-256 against the raw request body. */
  verifySignature(rawBody: Buffer | undefined, signatureHeader: string | undefined): boolean {
    const secret = this.config.get<string>('META_APP_SECRET');
    if (!secret || !rawBody || !signatureHeader || !/^sha256=[a-f0-9]{64}$/i.test(signatureHeader)) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const given = signatureHeader.slice('sha256='.length);
    return timingSafeEqual(Buffer.from(given, 'hex'), Buffer.from(expected, 'hex'));
  }

  private async graphGet(path: string, params: Record<string, string>): Promise<any> {
    if (!this.token) throw new BadRequestException('META_PAGE_ACCESS_TOKEN is not set in backend/.env.');
    const url = new URL(`${this.graphBase}/${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('access_token', this.token);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url.toString(), { signal: controller.signal });
      const data: any = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(data?.error?.message || `Graph API HTTP ${res.status}`);
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Converts one Graph API lead object into a CRM lead. */
  private async saveGraphLead(lead: any): Promise<boolean> {
    const fields: Record<string, string> = {};
    for (const f of lead?.field_data || []) {
      if (f?.name) fields[f.name] = Array.isArray(f.values) ? f.values.join(', ') : String(f.values ?? '');
    }
    fields.id = lead.id;
    if (lead.created_time) fields.created_time = lead.created_time;
    if (lead.campaign_name) fields.campaign_name = lead.campaign_name;
    if (lead.campaign_id) fields.campaign_id = lead.campaign_id;
    if (lead.platform) fields.platform = lead.platform;
    if (lead.adset_name) fields.adset_name = lead.adset_name;
    if (lead.ad_name) fields.ad_name = lead.ad_name;
    if (lead.ad_id) fields.ad_id = lead.ad_id;
    if (lead.form_id) fields.form_id = lead.form_id;

    const mapped = mapLeadFields(fields);
    const platform = mapped.platform;
    const channel = lead.is_organic ? (platform === 'instagram' ? 'instagram' : 'facebook') : 'meta_ads';
    const saved = await this.leadsService.ingestMapped(mapped, { source_channel: channel, raw: lead }, null);
    return !!saved;
  }

  /** Handles a webhook POST body (object = "page", field = "leadgen"). */
  async handleWebhook(body: any): Promise<{ received: number; created: number }> {
    let received = 0;
    let created = 0;
    const failedLeadIds: string[] = [];
    for (const entry of body?.entry || []) {
      for (const change of entry?.changes || []) {
        if (change?.field !== 'leadgen' || !change?.value?.leadgen_id) continue;
        received++;
        try {
          const lead = await this.graphGet(String(change.value.leadgen_id), { fields: LEAD_FIELDS });
          if (await this.saveGraphLead(lead)) created++;
        } catch (err: any) {
          this.logger.error(`Could not fetch Meta lead ${change.value.leadgen_id}: ${err?.message}`);
          failedLeadIds.push(String(change.value.leadgen_id));
        }
      }
    }
    if (failedLeadIds.length > 0) {
      throw new ServiceUnavailableException(
        `Could not process ${failedLeadIds.length} Meta lead event(s). Meta can retry this webhook delivery.`,
      );
    }
    return { received, created };
  }

  /** Pulls recent leads from the configured forms (catch-up if the webhook missed some). */
  async syncForms(formIdsParam?: string, maxPerForm = 500) {
    const formIds = formIdsParam
      ? formIdsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : this.formIds();
    if (formIds.length === 0) {
      throw new BadRequestException('No form IDs given. Set META_FORM_IDS in backend/.env or pass form_ids.');
    }
    const result: { form_id: string; fetched: number; created: number; error?: string }[] = [];
    for (const formId of formIds) {
      let fetched = 0;
      let createdCount = 0;
      try {
        let page: any = await this.graphGet(`${formId}/leads`, { fields: LEAD_FIELDS, limit: '100' });
        while (page && fetched < maxPerForm) {
          for (const lead of page.data || []) {
            fetched++;
            if (await this.saveGraphLead({ ...lead, form_id: lead.form_id || formId })) createdCount++;
          }
          const next = page.paging?.cursors?.after;
          if (!next || !page.paging?.next || fetched >= maxPerForm) break;
          page = await this.graphGet(`${formId}/leads`, { fields: LEAD_FIELDS, limit: '100', after: next });
        }
        result.push({ form_id: formId, fetched, created: createdCount });
      } catch (err: any) {
        result.push({ form_id: formId, fetched, created: createdCount, error: err?.message });
      }
    }
    return result;
  }
}
