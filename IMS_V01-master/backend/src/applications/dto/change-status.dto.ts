import { IsIn, IsOptional, IsString } from 'class-validator';
import { APPLICATION_STATUSES } from '../../entities/application.entity';

export class ChangeApplicationStatusDto {
  @IsIn(APPLICATION_STATUSES)
  status: string;

  @IsOptional()
  @IsString()
  note?: string;
}
