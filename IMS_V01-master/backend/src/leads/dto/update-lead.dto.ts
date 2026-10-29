import { IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { SOURCE_CHANNELS } from '../../common/source-channel';
import { LEAD_STATUSES } from '../../entities/lead.entity';

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  full_name?: string;

  @IsOptional()
  @IsString()
  phone_country_code?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]*$/, { message: 'Phone number must contain only numbers.' })
  phone_number?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  email?: string | null;

  @IsOptional()
  @IsIn(SOURCE_CHANNELS)
  source_channel?: string;

  @IsOptional()
  @IsString()
  source_detail?: string | null;

  @IsOptional()
  @IsString()
  campaign_name?: string | null;

  @IsOptional()
  @IsString()
  preferred_country?: string | null;

  @IsOptional()
  @IsString()
  preferred_course_level?: string | null;

  @IsOptional()
  @IsString()
  preferred_intake?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsIn(LEAD_STATUSES)
  status?: string;

  @IsOptional()
  @IsInt()
  assigned_to_user_id?: number | null;

  @IsOptional()
  @IsDateString()
  next_follow_up_date?: string | null;
}
