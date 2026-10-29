import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { SalaryService } from './salary.service';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/roles';

/** Confidential — admin only (checked on the server). */
@Roles(Role.ADMIN)
@Controller('salary')
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

  @Post()
  async create(@Body() dto: CreateSalaryDto) {
    return this.salaryService.create(dto);
  }

  @Get()
  async findAll(@Query('month') month?: string) {
    return this.salaryService.findAll(month);
  }

  @Post(':id/pay')
  async pay(@Param('id') id: string) {
    return this.salaryService.pay(Number(id));
  }
}
