import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { APPLICATION_STATUSES } from '../../entities/application.entity';

export class CreateApplicationDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  university_name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  course_name: string;

  @IsOptional()
  @IsString()
  course_level?: string;

  @IsOptional()
  @IsString()
  intake?: string;

  @IsOptional()
  @IsInt()
  country_id?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  application_fee?: number | null;

  @IsOptional()
  @IsString()
  application_fee_currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tuition_fee?: number | null;

  @IsOptional()
  @IsString()
  university_reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  assigned_to_user_id?: number | null;

  @IsOptional()
  @IsIn(APPLICATION_STATUSES)
  status?: string;
}
