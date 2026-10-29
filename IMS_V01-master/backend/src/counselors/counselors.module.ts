import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Counselor } from '../entities/counselor.entity';
import { CounselorsService } from './counselors.service';
import { CounselorsController } from './counselors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Counselor])],
  controllers: [CounselorsController],
  providers: [CounselorsService],
  exports: [TypeOrmModule],
})
export class CounselorsModule {}
