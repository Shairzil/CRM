import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class LinkExternalAccountDto {
  @IsNotEmpty()
  @IsString()
  system: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  external_id: string;

  @IsOptional()
  @IsEmail()
  external_email?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
