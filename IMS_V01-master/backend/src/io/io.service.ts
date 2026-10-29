import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IOEntry } from '../entities/io-entry.entity';
import { CreateIOEntryDto } from './dto/create-io-entry.dto';

@Injectable()
export class IOService {
  constructor(
    @InjectRepository(IOEntry)
    private ioRepo: Repository<IOEntry>,
  ) {}

  async create(dto: CreateIOEntryDto): Promise<IOEntry> {
    const entry = this.ioRepo.create(dto);
    return this.ioRepo.save(entry);
  }

  async findAll(month?: string): Promise<IOEntry[]> {
    const queryBuilder = this.ioRepo.createQueryBuilder('io');
    if (month) {
      queryBuilder.where('io.month = :month', { month });
    }
    queryBuilder.orderBy('io.employeeName', 'ASC').addOrderBy('io.month', 'ASC');
    return queryBuilder.getMany();
  }
}
