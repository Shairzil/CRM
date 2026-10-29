import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../entities/application.entity';
import { ApplicationStatusHistory } from '../entities/application-status-history.entity';
import { Student } from '../entities/student.entity';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Application, ApplicationStatusHistory, Student])],
  providers: [ApplicationsService],
  controllers: [ApplicationsController],
})
export class ApplicationsModule {}
