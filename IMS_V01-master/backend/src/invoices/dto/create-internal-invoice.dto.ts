import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class CreateInternalInvoiceDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0, { message: 'Amount in BDT must be positive.' })
  amount?: number;

  @IsNotEmpty()
  @IsString()
  purpose?: string;

  @IsNotEmpty()
  @IsString()
  payer?: string;
}
