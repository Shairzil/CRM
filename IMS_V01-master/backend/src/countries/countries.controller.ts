import { Controller, Get } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { Country } from '../entities/country.entity';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  async findAll(): Promise<Country[]> {
    return this.countriesService.findAll();
  }
}
