import { Controller, Get, Query, ParseFloatPipe } from '@nestjs/common';
import { CurrencyService } from './currency.service';

@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('convert')
  async convert(
    @Query('from') from: string,
    @Query('amount', ParseFloatPipe) amount: number,
    @Query('date') date?: string,
  ) {
    return this.currencyService.convertToBdt(from, amount);
  }
}
