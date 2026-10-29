import { ConfigService } from '@nestjs/config';

/** Reads JWT_SECRET and refuses to start with a missing or weak secret. */
export function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET is missing or shorter than 32 characters. Set a long random value in backend/.env ' +
        '(e.g. run: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))").',
    );
  }
  return secret;
}

/** Token lifetime in seconds (default 12 hours). */
export function getJwtExpiresInSeconds(config: ConfigService): number {
  const raw = Number(config.get<string>('JWT_EXPIRES_IN_SECONDS'));
  return Number.isFinite(raw) && raw > 0 ? raw : 12 * 60 * 60;
}
