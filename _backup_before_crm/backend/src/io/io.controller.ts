import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { IOService } from './io.service';
import { CreateIOEntryDto } from './dto/create-io-entry.dto';

@Controller('io')
export class IOController {
  constructor(private readonly ioService: IOService) {}

  @Post()
  async create(@Body() dto: CreateIOEntryDto) {
    return this.ioService.create(dto);
  }

  @Get()
  async findAll(@Query('month') month?: string) {
    return this.ioService.findAll(month);
  }
}
