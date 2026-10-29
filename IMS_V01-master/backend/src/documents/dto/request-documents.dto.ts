import { ArrayMinSize, IsArray, IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { DOCUMENT_TYPES } from '../../entities/student-document.entity';

export class RequestDocumentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(DOCUMENT_TYPES, { each: true })
  document_types: string[];

  /** Optional custom title (used when a single "other" document is requested). */
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  request_note?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;
}
