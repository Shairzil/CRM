import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { CounselorsService } from './counselors.service';
import { CreateCounselorDto } from './dto/create-counselor.dto';
import { Counselor } from '../entities/counselor.entity';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/roles';

@Controller('counselors')
export class CounselorsController {
  constructor(private readonly counselorsService: CounselorsService) {}

  @Get()
  async findAll(): Promise<Counselor[]> {
    return this.counselorsService.findAll();
  }

  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() createCounselorDto: CreateCounselorDto): Promise<Counselor> {
    return this.counselorsService.create(createCounselorDto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.counselorsService.remove(id);
  }
}
