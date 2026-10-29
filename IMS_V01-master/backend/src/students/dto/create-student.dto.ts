import { IsNotEmpty, IsString, IsEmail, Matches, IsNumber, Min, IsOptional, IsDateString, IsIn } from 'class-validator';
import { SOURCE_CHANNELS } from '../../common/source-channel';

export class CreateStudentDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z\s]+$/, { message: 'Name must contain only alphabets and spaces.' })
  name: string;

  @IsNotEmpty()
  @IsString()
  phone_country_code: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]+$/, { message: 'Phone number must contain only numbers.' })
  phone_number: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  email?: string | null;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z\s]+$/, { message: 'Counselor name must contain only alphabets and spaces.' })
  counselor_name: string;

  @IsNotEmpty()
  @IsString()
  study_level: string;

  @IsNotEmpty()
  @IsString()
  source_type: string; // 'employee' or 'social_media'

  @IsNotEmpty()
  @IsString()
  source_name: string; // Employee name or social media platform

  @IsNotEmpty()
  @IsString()
  date_of_opening: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0, { message: 'File opening fee must be positive.' })
  file_opening_fee_bdt: number;

  @IsOptional()
  @IsDateString()
  follow_up_date?: string | null;

  @IsOptional()
  @IsString()
  follow_up_note?: string | null;

  @IsOptional()
  @IsString()
  status?: string;

  /** Optional normalised channel (meta_ads, calling_team, reference, ...). Derived from source_type/source_name when empty. */
  @IsOptional()
  @IsIn(SOURCE_CHANNELS)
  source_channel?: string;
}
