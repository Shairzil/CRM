import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentDocument } from '../entities/student-document.entity';
import { Student } from '../entities/student.entity';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StudentDocument, Student])],
  providers: [DocumentsService],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
