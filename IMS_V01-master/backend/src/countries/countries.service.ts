import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from '../entities/country.entity';

@Injectable()
export class CountriesService {
  constructor(
    @InjectRepository(Country)
    private countriesRepository: Repository<Country>,
  ) {}

  async findAll(): Promise<Country[]> {
    return this.countriesRepository.find({ order: { name: 'ASC' } });
  }
}
