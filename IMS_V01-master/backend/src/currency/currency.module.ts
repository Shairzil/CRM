import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';

@Module({
  imports: [ConfigModule],
  providers: [CurrencyService],
  controllers: [CurrencyController],
  exports: [CurrencyService],
})
export class CurrencyModule {}
