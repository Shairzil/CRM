import { splitPhone } from '../common/phone.util';

/**
 * Maps arbitrary lead fields (Meta Lead Ads field_data, or CSV columns from a
 * Meta / Google Sheet export) to our lead columns. Anything we do not
 * recognise is kept as "question: answer" lines in notes.
 */
export interface MappedLead {
  full_name: string | null;
  phone_country_code: string;
  phone_number: string | null;
  email: string | null;
  preferred_country: string | null;
  preferred_course_level: string | null;
  preferred_intake: string | null;
  platform: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  adset_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  meta_form_id: string | null;
  meta_lead_id: string | null;
  source_created_at: Date | null;
  source_channel: string | null;
  extra_notes: string[];
}

function norm(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const IGNORE = new Set(['is_organic', 'platform', 'inbox_url', 'lead_status', 'form_name', 'ad_set_id', 'adset_id', 'campaign_id_', 'retailer_item_id']);

export function mapLeadFields(fields: Record<string, string | null | undefined>): MappedLead {
  const out: MappedLead = {
    full_name: null,
    phone_country_code: '+880',
    phone_number: null,
    email: null,
    preferred_country: null,
    preferred_course_level: null,
    preferred_intake: null,
    platform: null,
    campaign_id: null,
    campaign_name: null,
    adset_name: null,
    ad_id: null,
    ad_name: null,
    meta_form_id: null,
    meta_lead_id: null,
    source_created_at: null,
    source_channel: null,
    extra_notes: [],
  };
  let firstName: string | null = null;
  let lastName: string | null = null;

  for (const [rawKey, rawValue] of Object.entries(fields)) {
    const value = (rawValue ?? '').toString().trim();
    if (!value) continue;
    const key = norm(rawKey);

    if (['full_name', 'name', 'fullname', 'student_name', 'your_name'].includes(key)) out.full_name = value;
    else if (key === 'first_name') firstName = value;
    else if (key === 'last_name') lastName = value;
    else if (['phone_number', 'phone', 'mobile', 'mobile_number', 'phone_no', 'contact', 'contact_number', 'whatsapp', 'whatsapp_number'].includes(key)) {
      const p = splitPhone(value.replace(/^p:/i, ''));
      out.phone_country_code = p.phone_country_code;
      out.phone_number = p.phone_number || null;
    } else if (['email', 'email_address', 'e_mail'].includes(key)) out.email = value;
    else if (key === 'platform') {
      const platform = value.toLowerCase();
      out.platform = platform === 'fb' ? 'facebook' : platform === 'ig' ? 'instagram' : platform;
    }
    else if (key === 'campaign_name') out.campaign_name = value;
    else if (key === 'campaign_id') out.campaign_id = value.replace(/^c:/i, '');
    else if (key === 'adset_name' || key === 'ad_set_name') out.adset_name = value;
    else if (key === 'ad_name') out.ad_name = value;
    else if (key === 'ad_id') out.ad_id = value.replace(/^ag:|^a:/i, '');
    else if (key === 'form_id') out.meta_form_id = value.replace(/^f:/i, '');
    else if (key === 'id' || key === 'lead_id' || key === 'leadgen_id') out.meta_lead_id = value.replace(/^l:/i, '');
    else if (key === 'created_time' || key === 'created_at' || key === 'date') {
      const d = new Date(value);
      if (!isNaN(d.getTime())) out.source_created_at = d;
    } else if (key === 'source' || key === 'source_channel') out.source_channel = value;
    else if (key.includes('country') || key.includes('destination')) out.preferred_country = value;
    else if (key.includes('intake') || key.includes('when_do_you')) out.preferred_intake = value;
    else if (key.includes('level') || key.includes('degree') || key.includes('program')) out.preferred_course_level = value;
    else if (!IGNORE.has(key)) out.extra_notes.push(`${rawKey.replace(/_/g, ' ')}: ${value}`);
  }

  if (!out.full_name && (firstName || lastName)) {
    out.full_name = [firstName, lastName].filter(Boolean).join(' ');
  }
  return out;
}

/** Minimal CSV/TSV parser (quotes, escaped quotes, newlines inside quotes, BOM, UTF-16 Meta exports). */
export function parseDelimited(buffer: Buffer): Record<string, string>[] {
  let text: string;
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    text = buffer.subarray(2).toString('utf16le');
  } else {
    text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  }
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const delimiter = (firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length ? '\t' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (nonEmpty.length < 2) return [];
  const headers = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = (cells[idx] ?? '').trim();
    });
    return obj;
  });
}
