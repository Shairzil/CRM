import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { DOCUMENT_TYPES } from '../../entities/student-document.entity';

/** Text fields sent together with the multipart file. */
export class UploadDocumentDto {
  @IsIn(DOCUMENT_TYPES)
  document_type: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;
}
