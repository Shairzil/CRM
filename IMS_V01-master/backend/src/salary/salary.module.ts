import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Salary } from '../entities/salary.entity';
import { IOEntry } from '../entities/io-entry.entity';
import { SalaryService } from './salary.service';
import { SalaryController } from './salary.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Salary, IOEntry])],
  providers: [SalaryService],
  controllers: [SalaryController],
})
export class SalaryModule {}
