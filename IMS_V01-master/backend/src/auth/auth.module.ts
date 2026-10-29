import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { LoginRateLimiterService } from './login-rate-limiter.service';
import { getJwtExpiresInSeconds, getJwtSecret } from './jwt-secret';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: getJwtSecret(configService),
        signOptions: { expiresIn: getJwtExpiresInSeconds(configService) },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, LoginRateLimiterService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
