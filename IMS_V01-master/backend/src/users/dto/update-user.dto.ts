import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { ALL_ROLES } from '../../common/roles';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  full_name?: string | null;

  @IsOptional()
  @IsIn(ALL_ROLES)
  role?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsInt()
  employee_id?: number | null;

  @IsOptional()
  @IsInt()
  counselor_id?: number | null;
}
