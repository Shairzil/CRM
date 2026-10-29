import { IsString, IsEmail, Matches, IsOptional, IsDateString } from 'class-validator';

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z\s]+$/, { message: 'Name must contain only alphabets and spaces.' })
  name?: string;

  @IsOptional()
  @IsString()
  phone_country_code?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+$/, { message: 'Phone number must contain only numbers.' })
  phone_number?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  email?: string | null;

  @IsOptional()
  @IsDateString()
  follow_up_date?: string | null;

  @IsOptional()
  @IsString()
  follow_up_note?: string | null;

  @IsOptional()
  @IsString()
  status?: string;
}
