import { IsDateString, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** Everything except status (status changes go through POST /applications/:id/status). */
export class UpdateApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  university_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  course_name?: string;

  @IsOptional()
  @IsString()
  course_level?: string | null;

  @IsOptional()
  @IsString()
  intake?: string | null;

  @IsOptional()
  @IsInt()
  country_id?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  application_fee?: number | null;

  @IsOptional()
  @IsString()
  application_fee_currency?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tuition_fee?: number | null;

  @IsOptional()
  @IsString()
  university_reference?: string | null;

  @IsOptional()
  @IsDateString()
  submitted_at?: string | null;

  @IsOptional()
  @IsDateString()
  decision_at?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsInt()
  assigned_to_user_id?: number | null;
}
