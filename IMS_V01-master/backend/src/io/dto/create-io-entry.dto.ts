import { IsString, IsNumber, IsPositive, Matches } from 'class-validator';

export class CreateIOEntryDto {
  @IsString()
  employeeName: string;

  // Expected format: 'YYYY-MM'
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be in YYYY-MM format' })
  month: string;

  @IsNumber()
  amount: number;
}
