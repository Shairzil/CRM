import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { Employee } from '../entities/employee.entity';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  async findAll(): Promise<Employee[]> {
    return this.employeesService.findAll();
  }

  @Post()
  async create(@Body() createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    return this.employeesService.create(createEmployeeDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.employeesService.remove(id);
  }
}
