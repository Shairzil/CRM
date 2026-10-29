import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

/**
 * Simple in-memory brute-force protection for /auth/login.
 * After MAX_FAILURES failed attempts for the same IP + username within the
 * window, further attempts are rejected until the window expires.
 * (In-memory is enough for a single backend instance.)
 */
@Injectable()
export class LoginRateLimiterService {
  private readonly MAX_FAILURES = 5;
  private readonly WINDOW_MS = 15 * 60 * 1000;
  private readonly attempts = new Map<string, { count: number; firstAt: number }>();

  private key(ip: string, username: string) {
    return `${ip}|${(username || '').toLowerCase()}`;
  }

  assertAllowed(ip: string, username: string) {
    const entry = this.attempts.get(this.key(ip, username));
    if (!entry) return;
    if (Date.now() - entry.firstAt > this.WINDOW_MS) {
      this.attempts.delete(this.key(ip, username));
      return;
    }
    if (entry.count >= this.MAX_FAILURES) {
      const waitMin = Math.ceil((this.WINDOW_MS - (Date.now() - entry.firstAt)) / 60000);
      throw new HttpException(
        `Too many failed login attempts. Try again in ${waitMin} minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  recordFailure(ip: string, username: string) {
    const k = this.key(ip, username);
    const entry = this.attempts.get(k);
    if (!entry || Date.now() - entry.firstAt > this.WINDOW_MS) {
      this.attempts.set(k, { count: 1, firstAt: Date.now() });
    } else {
      entry.count += 1;
    }
    // keep the map from growing forever
    if (this.attempts.size > 10000) {
      const cutoff = Date.now() - this.WINDOW_MS;
      for (const [key, value] of this.attempts) {
        if (value.firstAt < cutoff) this.attempts.delete(key);
      }
    }
  }

  reset(ip: string, username: string) {
    this.attempts.delete(this.key(ip, username));
  }
}
