import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalAccount } from '../entities/external-account.entity';
import { Student } from '../entities/student.entity';
import { ExternalAccountsService } from './external-accounts.service';
import { ExternalAccountsController } from './external-accounts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExternalAccount, Student])],
  providers: [ExternalAccountsService],
  controllers: [ExternalAccountsController],
})
export class ExternalAccountsModule {}
