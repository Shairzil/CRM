import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { LoginRateLimiterService } from './login-rate-limiter.service';
import { getJwtExpiresInSeconds } from './jwt-secret';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private rateLimiter: LoginRateLimiterService,
    private configService: ConfigService,
  ) {}

  /** Loads a user including the password hash (excluded by default). */
  private async findWithPassword(where: { username?: string; id?: number }): Promise<User | null> {
    const qb = this.usersRepository.createQueryBuilder('user').addSelect('user.password');
    if (where.id !== undefined) qb.where('user.id = :id', { id: where.id });
    else qb.where('LOWER(user.username) = LOWER(:username)', { username: where.username });
    return qb.getOne();
  }

  async login(username: string, pass: string, ip: string) {
    this.rateLimiter.assertAllowed(ip, username);

    const user = await this.findWithPassword({ username });
    const valid = !!user && user.is_active && (await bcrypt.compare(pass, user.password));
    if (!user || !valid) {
      this.rateLimiter.recordFailure(ip, username);
      throw new UnauthorizedException('Invalid username or password.');
    }
    this.rateLimiter.reset(ip, username);

    await this.usersRepository.update(user.id, { last_login_at: new Date() });

    const payload = { sub: user.id, username: user.username, role: user.role, tv: user.token_version ?? 0 };
    return {
      access_token: this.jwtService.sign(payload),
      expires_in: getJwtExpiresInSeconds(this.configService),
      user: this.publicUser(user),
    };
  }

  async me(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: { employee: true, counselor: true },
    });
    if (!user) throw new NotFoundException('User not found.');
    return this.publicUser(user);
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.findWithPassword({ id: userId });
    if (!user) throw new NotFoundException('User not found.');
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new BadRequestException('Current password is incorrect.');
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException('New password must be different from the current one.');
    }
    await this.usersRepository.update(user.id, {
      password: await bcrypt.hash(newPassword, 10),
      token_version: (user.token_version ?? 0) + 1,
    });
    // Old tokens are now invalid; give the user a fresh one.
    const fresh = await this.usersRepository.findOne({ where: { id: user.id } });
    const payload = { sub: user.id, username: user.username, role: user.role, tv: fresh?.token_version ?? 0 };
    return { access_token: this.jwtService.sign(payload), expires_in: getJwtExpiresInSeconds(this.configService) };
  }

  private publicUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name ?? null,
      role: user.role,
      employee_id: user.employee_id ?? null,
      employee_name: user.employee?.name ?? null,
      counselor_id: user.counselor_id ?? null,
      counselor_name: user.counselor?.name ?? null,
    };
  }
}
