/**
 * Standard lead / student source channels used for CRM reporting.
 * The old free-text source_type / source_name columns are kept for the
 * existing screens; source_channel is the normalised value.
 */
export const SOURCE_CHANNELS = [
  'meta_ads',
  'facebook',
  'instagram',
  'linkedin',
  'calling_team',
  'reference',
  'employee_reference',
  'walk_in',
  'website',
  'other',
] as const;

export type SourceChannel = (typeof SOURCE_CHANNELS)[number];

/** Derive a channel from the legacy source_type / source_name pair. */
export function deriveSourceChannel(sourceType?: string | null, sourceName?: string | null): SourceChannel {
  const type = (sourceType || '').toLowerCase().trim();
  const name = (sourceName || '').toLowerCase().trim();
  if (type === 'employee') return 'employee_reference';
  if (name.includes('meta')) return 'meta_ads';
  if (name.includes('facebook') || name === 'fb') return 'facebook';
  if (name.includes('instagram')) return 'instagram';
  if (name.includes('linkedin')) return 'linkedin';
  if (name.includes('call')) return 'calling_team';
  if (name.includes('reference') || name.includes('referral')) return 'reference';
  if (name.includes('website') || name.includes('web')) return 'website';
  if (name.includes('walk')) return 'walk_in';
  return 'other';
}
