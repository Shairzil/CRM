import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { AuthUser, Role } from '../common/roles';
import { getJwtSecret } from './jwt-secret';

interface JwtPayload {
  sub: number;
  username: string;
  role: string;
  tv?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(configService),
    });
  }

  /**
   * Runs on every authenticated request. The user is re-loaded so that a
   * deactivated user, a role change or a password reset takes effect immediately.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.usersRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.is_active || (user.token_version ?? 0) !== (payload.tv ?? 0)) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }
    return {
      id: user.id,
      username: user.username,
      role: user.role as Role,
      employee_id: user.employee_id ?? null,
      counselor_id: user.counselor_id ?? null,
    };
  }
}
