import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, HttpCode } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/roles';
import type { AuthUser } from '../common/roles';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Any logged-in user: list of active users for "assign to" dropdowns. */
  @Get('assignable')
  findAssignable() {
    return this.usersService.findAssignable();
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto, @CurrentUser() actor: AuthUser) {
    return this.usersService.update(id, dto, actor.id);
  }

  @Post(':id/reset-password')
  @Roles(Role.ADMIN)
  @HttpCode(200)
  resetPassword(@Param('id', ParseIntPipe) id: number, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(id, dto.password);
  }
}
