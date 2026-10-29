import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewDocumentDto {
  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  review_note?: string;
}
