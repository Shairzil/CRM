import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private employeesRepository: Repository<Employee>,
  ) {}

  async findAll(): Promise<Employee[]> {
    return this.employeesRepository.find({ order: { name: 'ASC' } });
  }

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    const employee = this.employeesRepository.create(createEmployeeDto);
    return this.employeesRepository.save(employee);
  }

  async remove(id: number): Promise<void> {
    const result = await this.employeesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
  }
}
