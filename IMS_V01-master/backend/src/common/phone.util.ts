/**
 * Phone helpers.
 *
 * The app stores Bangladeshi numbers as country code "+880" plus the local
 * number without the leading zero (e.g. "+880" / "1712345678").
 * `phoneKey` gives a comparable key for duplicate detection: the last 10 digits.
 */
export function digitsOnly(value: string | null | undefined): string {
  return (value || '').replace(/\D/g, '');
}

export function phoneKey(countryCode: string | null | undefined, number: string | null | undefined): string {
  const all = digitsOnly(countryCode) + digitsOnly(number);
  return all.length > 10 ? all.slice(-10) : all;
}

/**
 * Split a free-form phone number (e.g. "+8801712345678", "01712345678",
 * "8801712345678") into the app's { country code, number } convention.
 */
export function splitPhone(raw: string | null | undefined, defaultCountryCode = '+880'): {
  phone_country_code: string;
  phone_number: string;
} {
  const trimmed = (raw || '').trim();
  let digits = digitsOnly(trimmed);

  if (digits.startsWith('880') && digits.length >= 12) {
    return { phone_country_code: '+880', phone_number: digits.slice(3).replace(/^0/, '') };
  }
  if (!trimmed.startsWith('+') && digits.startsWith('0') && digits.length === 11) {
    return { phone_country_code: '+880', phone_number: digits.slice(1) };
  }
  const knownCodes = ['+44', '+61', '+91', '+1'];
  if (trimmed.startsWith('+')) {
    for (const code of knownCodes) {
      const codeDigits = code.slice(1);
      if (digits.startsWith(codeDigits)) {
        return { phone_country_code: code, phone_number: digits.slice(codeDigits.length) };
      }
    }
  }
  if (defaultCountryCode === '+880') digits = digits.replace(/^0/, '');
  return { phone_country_code: defaultCountryCode, phone_number: digits };
}
