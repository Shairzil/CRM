import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CurrencyService {
  private apiKey?: string;

  constructor(configService: ConfigService) {
    this.apiKey = configService.get<string>('EXCHANGE_RATE_API_KEY');
  }

  async convertToBdt(from: string, amount: number): Promise<{ rate: number; converted_bdt: number; source_currency: string; amount: number }> {
    let rate = 117.50; // Standard fallback BDT conversion rate

    // 1. Try with the v6 API Key if configured
    try {
      if (this.apiKey && this.apiKey !== 'free_or_empty' && this.apiKey !== '') {
        const url = `https://v6.exchangerate-api.com/v6/${this.apiKey}/pair/${from}/BDT`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.result === 'success' && data.conversion_rate) {
            rate = parseFloat(data.conversion_rate);
            return {
              rate,
              converted_bdt: Math.round(amount * rate * 100) / 100,
              source_currency: from,
              amount,
            };
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch from ExchangeRate-API v6, falling back to public endpoint:', e);
    }

    // 2. Try free public endpoint
    try {
      const url = `https://open.er-api.com/v6/latest/${from}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.result === 'success' && data.rates && data.rates['BDT']) {
          rate = parseFloat(data.rates['BDT']);
        }
      }
    } catch (e) {
      console.error('Failed to convert currency via open.er-api.com:', e);
    }

    return {
      rate,
      converted_bdt: Math.round(amount * rate * 100) / 100,
      source_currency: from,
      amount,
    };
  }
}
