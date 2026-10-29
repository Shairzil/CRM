import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../entities/invoice.entity';
import { Student } from '../entities/student.entity';
import { Sequence } from '../entities/sequence.entity';
import { Salary } from '../entities/salary.entity';
import { IOEntry } from '../entities/io-entry.entity';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PdfService } from './pdf.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Student, Sequence, Salary, IOEntry]),
    ConfigModule,
  ],
  providers: [InvoicesService, PdfService],
  controllers: [InvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}
