import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersRepository.findOne({ where: { username } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(username: string, pass: string) {
    const user = await this.validateUser(username, pass);
    if (!user) {
      throw new UnauthorizedException('Invalid username or password.');
    }
    const payload = { username: user.username, sub: user.id };
    
    /* 
      FIREBASE AUTH MIGRATION NOTE:
      To migrate this to Firebase Auth in production:
      1. Swapping JWT generation: Instead of generating a custom JWT with NestJS JwtService,
         the user would log in via the Firebase Client SDK on the frontend.
      2. The frontend would send the Firebase ID Token (JWT) in the Authorization header.
      3. On the NestJS side, the JwtStrategy would verify the ID token using the `firebase-admin` SDK's
         `admin.auth().verifyIdToken(token)` method instead of passport-jwt.
    */
    
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
