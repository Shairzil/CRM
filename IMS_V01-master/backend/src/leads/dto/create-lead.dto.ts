import { IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { SOURCE_CHANNELS } from '../../common/source-channel';

export class CreateLeadDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  full_name: string;

  @IsOptional()
  @IsString()
  phone_country_code?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]*$/, { message: 'Phone number must contain only numbers.' })
  phone_number?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  email?: string;

  @IsIn(SOURCE_CHANNELS)
  source_channel: string;

  @IsOptional()
  @IsString()
  source_detail?: string;

  @IsOptional()
  @IsString()
  campaign_name?: string;

  @IsOptional()
  @IsString()
  adset_name?: string;

  @IsOptional()
  @IsString()
  ad_name?: string;

  @IsOptional()
  @IsString()
  preferred_country?: string;

  @IsOptional()
  @IsString()
  preferred_course_level?: string;

  @IsOptional()
  @IsString()
  preferred_intake?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  assigned_to_user_id?: number | null;

  @IsOptional()
  @IsDateString()
  next_follow_up_date?: string;

  /** Set true to save even when a lead with the same phone already exists. */
  @IsOptional()
  @IsBoolean()
  allow_duplicate?: boolean;
}
