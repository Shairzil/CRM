import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true, // session-based, no expiration on token itself
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback_secret_key_nexted_advisors',
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, username: payload.username };
  }
}
