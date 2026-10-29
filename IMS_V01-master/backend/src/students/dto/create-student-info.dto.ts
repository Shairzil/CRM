import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';
import { SOURCE_CHANNELS } from '../../common/source-channel';

export class CreateStudentInfoDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phone_country_code: string;

  @IsNotEmpty()
  @IsString()
  phone_number: string;

  @IsOptional()
  @IsString()
  preferred_country?: string;

  @IsOptional()
  @IsString()
  preferred_course?: string;

  @IsOptional()
  @IsString()
  preferred_course_level?: string;

  @IsOptional()
  @IsString()
  preferred_intake?: string;

  @IsOptional()
  @IsString()
  ssc_gpa?: string;

  @IsOptional()
  @IsString()
  ssc_year?: string;

  @IsOptional()
  @IsString()
  hsc_gpa?: string;

  @IsOptional()
  @IsString()
  hsc_year?: string;

  @IsOptional()
  @IsString()
  bachelor_subject?: string;

  @IsOptional()
  @IsString()
  bachelor_university?: string;

  @IsOptional()
  @IsString()
  bachelor_cgpa?: string;

  @IsOptional()
  @IsString()
  bachelor_year?: string;

  @IsOptional()
  @IsString()
  master_subject?: string;

  @IsOptional()
  @IsString()
  master_university?: string;

  @IsOptional()
  @IsString()
  master_cgpa?: string;

  @IsOptional()
  @IsString()
  master_year?: string;

  @IsOptional()
  @IsString()
  test_taken?: string;

  @IsOptional()
  @IsString()
  overall_score?: string;

  @IsOptional()
  @IsString()
  study_gap?: string;

  @IsOptional()
  @IsString()
  work_experience?: string;

  @IsOptional()
  @IsString()
  visa_refusal?: string;

  @IsOptional()
  @IsString()
  estimated_budget?: string;

  @IsOptional()
  @IsString()
  counsellor_notes?: string;

  @IsOptional()
  @IsString()
  counselor_name?: string;

  @IsOptional()
  @IsString()
  source_type?: string;

  @IsOptional()
  @IsString()
  source_name?: string;

  @IsOptional()
  @IsString()
  cv_name?: string;

  @IsOptional()
  @IsString()
  cv_mime?: string;

  @IsOptional()
  @IsString()
  cv_data?: string;

  /** Optional normalised channel (meta_ads, calling_team, reference, ...). Derived from source_type/source_name when empty. */
  @IsOptional()
  @IsIn(SOURCE_CHANNELS)
  source_channel?: string;
}
