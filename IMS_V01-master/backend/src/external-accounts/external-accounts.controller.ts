import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, HttpCode } from '@nestjs/common';
import { ExternalAccountsService } from './external-accounts.service';
import { LinkExternalAccountDto } from './dto/link-external-account.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/roles';
import type { AuthUser } from '../common/roles';

@Controller()
export class ExternalAccountsController {
  constructor(private readonly service: ExternalAccountsService) {}

  @Get('external-systems')
  systems() {
    return this.service.listSystems();
  }

  @Get('students/:studentId/external-accounts')
  list(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.service.listForStudent(studentId);
  }

  @Post('students/:studentId/external-accounts/lookup')
  @HttpCode(200)
  lookup(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.service.lookup(studentId);
  }

  @Post('students/:studentId/external-accounts')
  @Roles(Role.COUNSELOR, Role.ACCOUNTS)
  link(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: LinkExternalAccountDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.link(studentId, dto, user.id);
  }

  @Delete('students/:studentId/external-accounts/:accountId')
  @Roles(Role.COUNSELOR, Role.ACCOUNTS)
  unlink(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Param('accountId', ParseIntPipe) accountId: number,
  ) {
    return this.service.unlink(studentId, accountId);
  }
}
