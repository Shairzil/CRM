import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  current_password: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters.' })
  new_password: string;
}
