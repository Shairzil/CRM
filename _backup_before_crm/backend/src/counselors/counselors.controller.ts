import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { CounselorsService } from './counselors.service';
import { CreateCounselorDto } from './dto/create-counselor.dto';
import { Counselor } from '../entities/counselor.entity';

@Controller('counselors')
export class CounselorsController {
  constructor(private readonly counselorsService: CounselorsService) {}

  @Get()
  async findAll(): Promise<Counselor[]> {
    return this.counselorsService.findAll();
  }

  @Post()
  async create(@Body() createCounselorDto: CreateCounselorDto): Promise<Counselor> {
    return this.counselorsService.create(createCounselorDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.counselorsService.remove(id);
  }
}
