import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentDocument } from '../entities/student-document.entity';
import { Student } from '../entities/student.entity';
import { StorageService } from '../storage/storage.service';
import { RequestDocumentsDto } from './dto/request-documents.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { ReviewDocumentDto } from './dto/review-document.dto';

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(StudentDocument)
    private readonly documentsRepository: Repository<StudentDocument>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    private readonly storage: StorageService,
  ) {}

  private async assertStudent(studentId: number) {
    const count = await this.studentsRepository.count({ where: { id: studentId } });
    if (count === 0) throw new NotFoundException(`Student ${studentId} not found.`);
  }

  private assertFile(file: Express.Multer.File | undefined): asserts file is Express.Multer.File {
    if (!file) throw new BadRequestException('No file uploaded. Send it in the "file" field.');
    if (file.size > MAX_DOCUMENT_BYTES) throw new BadRequestException('File is larger than 10 MB.');
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only PDF, JPG, PNG, WEBP, DOC and DOCX files are allowed.');
    }
  }

  private present(doc: StudentDocument) {
    return {
      id: doc.id,
      student_id: doc.student_id,
      student_name: doc.student?.name,
      student_code: doc.student?.student_id,
      document_type: doc.document_type,
      title: doc.title,
      status: doc.status,
      request_note: doc.request_note,
      due_date: doc.due_date,
      requested_by: doc.requested_by ? doc.requested_by.full_name || doc.requested_by.username : null,
      file_name: doc.file_name,
      file_mime: doc.file_mime,
      file_size: doc.file_size,
      has_file: !!doc.file_key,
      uploaded_by: doc.uploaded_by ? doc.uploaded_by.full_name || doc.uploaded_by.username : null,
      uploaded_at: doc.uploaded_at,
      reviewed_by: doc.reviewed_by ? doc.reviewed_by.full_name || doc.reviewed_by.username : null,
      reviewed_at: doc.reviewed_at,
      review_note: doc.review_note,
      created_at: doc.created_at,
    };
  }

  private relations = { requested_by: true, uploaded_by: true, reviewed_by: true, student: true } as const;

  async listForStudent(studentId: number) {
    await this.assertStudent(studentId);
    const docs = await this.documentsRepository.find({
      where: { student_id: studentId },
      relations: this.relations,
      order: { created_at: 'DESC' },
    });
    return docs.map((d) => this.present(d));
  }

  /** Review queue / overview across all students. */
  async list(status?: string) {
    const docs = await this.documentsRepository.find({
      where: status ? { status } : {},
      relations: this.relations,
      order: { updated_at: 'DESC' },
      take: 500,
    });
    return docs.map((d) => this.present(d));
  }

  async summary() {
    const rows: { status: string; count: string }[] = await this.documentsRepository
      .createQueryBuilder('document')
      .select('document.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('document.status')
      .getRawMany();
    const by_status = Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
    const total = Object.values(by_status).reduce((sum, count) => sum + count, 0);
    return { total, by_status };
  }

  async request(studentId: number, dto: RequestDocumentsDto, userId: number) {
    await this.assertStudent(studentId);
    const created: StudentDocument[] = [];
    for (const type of dto.document_types) {
      const doc = this.documentsRepository.create({
        student_id: studentId,
        document_type: type,
        title: dto.document_types.length === 1 ? dto.title ?? null : null,
        status: 'requested',
        request_note: dto.request_note ?? null,
        due_date: dto.due_date ?? null,
        requested_by_user_id: userId,
      });
      created.push(await this.documentsRepository.save(doc));
    }
    return this.listForStudent(studentId);
  }

  /** Upload a new document directly (no prior request). */
  async uploadNew(studentId: number, dto: UploadDocumentDto, file: Express.Multer.File | undefined, userId: number) {
    await this.assertStudent(studentId);
    this.assertFile(file);
    const key = await this.storage.save(`students/${studentId}`, file.originalname, file.buffer);
    const doc = this.documentsRepository.create({
      student_id: studentId,
      document_type: dto.document_type,
      title: dto.title ?? null,
      status: 'uploaded',
      file_key: key,
      file_name: file.originalname,
      file_mime: file.mimetype,
      file_size: file.size,
      uploaded_by_user_id: userId,
      uploaded_at: new Date(),
    });
    const saved = await this.documentsRepository.save(doc);
    return this.getOne(saved.id);
  }

  /** Upload (or replace) the file of an existing / requested document. */
  async uploadFile(documentId: number, file: Express.Multer.File | undefined, userId: number) {
    const doc = await this.documentsRepository.findOne({ where: { id: documentId } });
    if (!doc) throw new NotFoundException(`Document ${documentId} not found.`);
    this.assertFile(file);

    const oldKey = doc.file_key;
    doc.file_key = await this.storage.save(`students/${doc.student_id}`, file.originalname, file.buffer);
    doc.file_name = file.originalname;
    doc.file_mime = file.mimetype;
    doc.file_size = file.size;
    doc.uploaded_by_user_id = userId;
    doc.uploaded_at = new Date();
    // A new file always needs a fresh review.
    doc.status = 'uploaded';
    doc.reviewed_at = null;
    doc.reviewed_by_user_id = null;
    doc.review_note = null;
    await this.documentsRepository.save(doc);
    await this.storage.delete(oldKey);
    return this.getOne(doc.id);
  }

  async review(documentId: number, dto: ReviewDocumentDto, userId: number) {
    const doc = await this.documentsRepository.findOne({ where: { id: documentId } });
    if (!doc) throw new NotFoundException(`Document ${documentId} not found.`);
    if (!doc.file_key) throw new BadRequestException('Nothing to review yet — no file has been uploaded.');
    if (dto.status === 'rejected' && !dto.review_note?.trim()) {
      throw new BadRequestException('Please write why the document is rejected, so the student can fix it.');
    }
    doc.status = dto.status;
    doc.review_note = dto.review_note?.trim() || null;
    doc.reviewed_by_user_id = userId;
    doc.reviewed_at = new Date();
    await this.documentsRepository.save(doc);
    return this.getOne(doc.id);
  }

  async getOne(id: number) {
    const doc = await this.documentsRepository.findOne({ where: { id }, relations: this.relations });
    if (!doc) throw new NotFoundException(`Document ${id} not found.`);
    return this.present(doc);
  }

  async getFile(id: number) {
    const doc = await this.documentsRepository.findOne({ where: { id } });
    if (!doc || !doc.file_key) throw new NotFoundException('This document has no file yet.');
    return {
      stream: this.storage.createReadStream(doc.file_key),
      name: doc.file_name || `document-${id}`,
      mime: doc.file_mime || 'application/octet-stream',
    };
  }

  async remove(id: number) {
    const doc = await this.documentsRepository.findOne({ where: { id } });
    if (!doc) throw new NotFoundException(`Document ${id} not found.`);
    await this.documentsRepository.delete(id);
    await this.storage.delete(doc.file_key);
    return { success: true };
  }
}
