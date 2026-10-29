import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { MetaLeadsService } from './meta-leads.service';
import { LeadsService } from './leads.service';

describe('MetaLeadsService', () => {
  const rawBody = Buffer.from('{"entry":[]}');
  const configValues: Record<string, string> = {
    META_APP_SECRET: 'test-app-secret',
    META_PAGE_ACCESS_TOKEN: 'test-page-token',
    META_VERIFY_TOKEN: 'test-verify-token',
  };
  const config = {
    get: (key: string) => configValues[key],
  } as ConfigService;
  const leadsService = {
    ingestMapped: jest.fn(),
  } as unknown as LeadsService;
  let service: MetaLeadsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MetaLeadsService(config, leadsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('accepts only a valid SHA-256 signature for the raw payload', () => {
    const signature = createHmac('sha256', configValues.META_APP_SECRET).update(rawBody).digest('hex');
    expect(service.verifySignature(rawBody, `sha256=${signature}`)).toBe(true);
    expect(service.verifySignature(rawBody, `sha256=${'z'.repeat(64)}`)).toBe(false);
    expect(service.verifySignature(rawBody, undefined)).toBe(false);
  });

  it('stores the Facebook/Instagram platform and Meta fields with the CRM lead', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'meta-lead-1',
        platform: 'ig',
        campaign_name: 'Winter intake',
        form_id: 'form-4',
        field_data: [
          { name: 'full_name', values: ['Ayesha Rahman'] },
          { name: 'phone_number', values: ['+8801712345678'] },
        ],
      }),
    } as Response);
    (leadsService.ingestMapped as jest.Mock).mockResolvedValue({ id: 1 });

    await expect(service.handleWebhook({
      entry: [{ changes: [{ field: 'leadgen', value: { leadgen_id: 'meta-lead-1' } }] }],
    })).resolves.toEqual({ received: 1, created: 1 });

    expect(leadsService.ingestMapped).toHaveBeenCalledWith(
      expect.objectContaining({
        meta_lead_id: 'meta-lead-1',
        meta_form_id: 'form-4',
        campaign_name: 'Winter intake',
        platform: 'instagram',
      }),
      expect.objectContaining({ source_channel: 'meta_ads' }),
      null,
    );
  });

  it('asks Meta to retry if a lead cannot be fetched from Graph API', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: { message: 'Graph API unavailable' } }),
    } as Response);

    await expect(service.handleWebhook({
      entry: [{ changes: [{ field: 'leadgen', value: { leadgen_id: 'meta-lead-2' } }] }],
    })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
