import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IOEntry } from '../entities/io-entry.entity';
import { IOService } from './io.service';
import { IOController } from './io.controller';

@Module({
  imports: [TypeOrmModule.forFeature([IOEntry])],
  providers: [IOService],
  controllers: [IOController],
})
export class IOModule {}
