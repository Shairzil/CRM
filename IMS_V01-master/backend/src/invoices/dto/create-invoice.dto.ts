import { IsNotEmpty, IsString, IsNumber, Min, Matches, IsOptional, IsInt } from 'class-validator';

export class CreateInvoiceDto {
  @IsNotEmpty()
  @IsNumber()
  student_id?: number;

  @IsNotEmpty()
  @IsString()
  payer_name?: string;

  @IsOptional()
  @IsString()
  payer_phone_country_code?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+$/, { message: 'Payer phone number must contain only numbers.' })
  payer_phone_number?: string;

  @IsNotEmpty()
  @IsString()
  payment_method?: string; // 'cash' | 'bank' | 'card' | 'mobile'

  @IsOptional()
  @IsString()
  payment_detail?: string; // ACC NO / Card NO / Phone NO depending on method

  @IsOptional()
  @IsString()
  bank_name?: string; // Only for bank payment method

  @IsOptional()
  @IsNumber()
  country_id?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Application fee in BDT must be positive.' })
  application_fee_bdt?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Other fee in BDT must be positive.' })
  other_fee_bdt?: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  information?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0, { message: 'Paid amount must be positive.' })
  paid_amount_bdt?: number;

  /** Employee who collected the money (employees.id). */
  @IsOptional()
  @IsInt()
  collected_by_employee_id?: number | null;
}
