import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ChangeApplicationStatusDto } from './dto/change-status.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/roles';
import type { AuthUser } from '../common/roles';

@Controller()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get('applications')
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('student_id') studentId?: string,
    @Query('assigned') assigned?: string,
    @Query('search') search?: string,
  ) {
    return this.applicationsService.list({
      status: status || undefined,
      student_id: studentId ? Number(studentId) : undefined,
      assigned_to_user_id: assigned === 'me' ? user.id : undefined,
      search: search?.trim() || undefined,
    });
  }

  @Get('applications/summary')
  summary() {
    return this.applicationsService.summary();
  }

  @Get('applications/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.findOne(id);
  }

  @Get('students/:studentId/applications')
  listForStudent(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.applicationsService.listForStudent(studentId);
  }

  @Post('students/:studentId/applications')
  @Roles(Role.COUNSELOR, Role.ACCOUNTS)
  create(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: CreateApplicationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.applicationsService.create(studentId, dto, user.id);
  }

  @Patch('applications/:id')
  @Roles(Role.COUNSELOR, Role.ACCOUNTS)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateApplicationDto) {
    return this.applicationsService.update(id, dto);
  }

  @Post('applications/:id/status')
  @Roles(Role.COUNSELOR, Role.ACCOUNTS)
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeApplicationStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.applicationsService.changeStatus(id, dto, user.id);
  }

  @Delete('applications/:id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.remove(id);
  }
}
