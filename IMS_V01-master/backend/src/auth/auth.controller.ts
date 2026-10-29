import { Controller, Post, Get, Body, Req, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from './current-user.decorator';
import type { AuthUser } from '../common/roles';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const ip = (req.ip || req.socket?.remoteAddress || 'unknown') as string;
    return this.authService.login(loginDto.username, loginDto.password, ip);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.id);
  }

  @Post('change-password')
  @HttpCode(200)
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto.current_password, dto.new_password);
  }
}
