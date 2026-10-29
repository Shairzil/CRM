import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '../entities/student.entity';
import { Sequence } from '../entities/sequence.entity';
import { Invoice } from '../entities/invoice.entity';
import { Country } from '../entities/country.entity';
import { StudentInfo } from '../entities/student-info.entity';
import { Employee } from '../entities/employee.entity';
import { Counselor } from '../entities/counselor.entity';
import { StudentFollowUp } from '../entities/student-follow-up.entity';
import { StudentsService } from './students.service';
import { LeadsModule } from '../leads/leads.module';

import { StudentsController } from './students.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, Sequence, Invoice, Country, StudentInfo, Employee, Counselor, StudentFollowUp]),
    LeadsModule,

  ],
  providers: [StudentsService],
  controllers: [StudentsController],
  exports: [StudentsService],
})
export class StudentsModule {}
