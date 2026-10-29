import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ALL_ROLES } from '../../common/roles';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{3,40}$/, { message: 'Username: 3-40 letters, numbers, dot, dash or underscore.' })
  username: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  password: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsIn(ALL_ROLES)
  role: string;

  @IsOptional()
  @IsInt()
  employee_id?: number | null;

  @IsOptional()
  @IsInt()
  counselor_id?: number | null;
}
