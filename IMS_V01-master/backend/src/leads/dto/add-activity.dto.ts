import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LEAD_STATUSES } from '../../entities/lead.entity';

export class AddLeadActivityDto {
  @IsIn(['note', 'call'])
  type: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  /** Optionally move the lead to a new status in the same step (e.g. after a call). */
  @IsOptional()
  @IsIn(LEAD_STATUSES)
  status?: string;

  @IsOptional()
  @IsDateString()
  next_follow_up_date?: string | null;
}
