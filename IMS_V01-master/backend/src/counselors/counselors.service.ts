import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Counselor } from '../entities/counselor.entity';
import { CreateCounselorDto } from './dto/create-counselor.dto';

@Injectable()
export class CounselorsService {
  constructor(
    @InjectRepository(Counselor)
    private counselorsRepository: Repository<Counselor>,
  ) {}

  async findAll(): Promise<Counselor[]> {
    return this.counselorsRepository.find({ order: { name: 'ASC' } });
  }

  async create(createCounselorDto: CreateCounselorDto): Promise<Counselor> {
    const counselor = this.counselorsRepository.create(createCounselorDto);
    return this.counselorsRepository.save(counselor);
  }

  async remove(id: number): Promise<void> {
    const result = await this.counselorsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Counselor with ID ${id} not found`);
    }
  }
}
