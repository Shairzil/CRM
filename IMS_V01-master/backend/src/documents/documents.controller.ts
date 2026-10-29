import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService, MAX_DOCUMENT_BYTES } from './documents.service';
import { RequestDocumentsDto } from './dto/request-documents.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { ReviewDocumentDto } from './dto/review-document.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/roles';
import type { AuthUser } from '../common/roles';

const uploadInterceptor = FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_BYTES } });

@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('documents/summary')
  summary() {
    return this.documentsService.summary();
  }

  @Get('documents')
  list(@Query('status') status?: string) {
    return this.documentsService.list(status);
  }

  @Get('students/:studentId/documents')
  listForStudent(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.documentsService.listForStudent(studentId);
  }

  @Post('students/:studentId/documents/request')
  request(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: RequestDocumentsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.request(studentId, dto, user.id);
  }

  @Post('students/:studentId/documents')
  @UseInterceptors(uploadInterceptor)
  uploadNew(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.uploadNew(studentId, dto, file, user.id);
  }

  @Post('documents/:id/file')
  @UseInterceptors(uploadInterceptor)
  uploadFile(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.uploadFile(id, file, user.id);
  }

  @Patch('documents/:id/review')
  @Roles(Role.COUNSELOR, Role.ACCOUNTS)
  review(@Param('id', ParseIntPipe) id: number, @Body() dto: ReviewDocumentDto, @CurrentUser() user: AuthUser) {
    return this.documentsService.review(id, dto, user.id);
  }

  @Get('documents/:id/file')
  async file(@Param('id', ParseIntPipe) id: number, @Res() res: any) {
    const { stream, name, mime } = await this.documentsService.getFile(id);
    res.set({
      'Content-Type': mime,
      'Content-Disposition': `inline; filename="${encodeURIComponent(name)}"`,
      'X-Content-Type-Options': 'nosniff',
    });
    stream.pipe(res);
  }

  @Delete('documents/:id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.documentsService.remove(id);
  }
}
