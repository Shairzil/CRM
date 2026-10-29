import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application, APPLICATION_STATUSES } from '../entities/application.entity';
import { ApplicationStatusHistory } from '../entities/application-status-history.entity';
import { Student } from '../entities/student.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ChangeApplicationStatusDto } from './dto/change-status.dto';

const DECISION_STATUSES = new Set(['conditional_offer', 'unconditional_offer', 'rejected']);

function today(): string {
  return new Date().toISOString().substring(0, 10);
}

export interface ApplicationFilters {
  status?: string;
  student_id?: number;
  assigned_to_user_id?: number;
  search?: string;
}

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationsRepository: Repository<Application>,
    @InjectRepository(ApplicationStatusHistory)
    private readonly historyRepository: Repository<ApplicationStatusHistory>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
  ) {}

  private present(app: Application) {
    return {
      id: app.id,
      student_id: app.student_id,
      student_name: app.student?.name ?? null,
      student_code: app.student?.student_id ?? null,
      country_id: app.country_id,
      country_name: app.country?.name ?? null,
      university_name: app.university_name,
      course_name: app.course_name,
      course_level: app.course_level,
      intake: app.intake,
      status: app.status,
      application_fee: app.application_fee,
      application_fee_currency: app.application_fee_currency,
      tuition_fee: app.tuition_fee,
      university_reference: app.university_reference,
      submitted_at: app.submitted_at,
      decision_at: app.decision_at,
      notes: app.notes,
      assigned_to_user_id: app.assigned_to_user_id,
      assigned_to_name: app.assigned_to ? app.assigned_to.full_name || app.assigned_to.username : null,
      created_at: app.created_at,
      updated_at: app.updated_at,
    };
  }

  async list(filters: ApplicationFilters) {
    const qb = this.applicationsRepository
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.student', 'student')
      .leftJoinAndSelect('app.country', 'country')
      .leftJoinAndSelect('app.assigned_to', 'assigned_to')
      .orderBy('app.updated_at', 'DESC');

    if (filters.status) qb.andWhere('app.status = :status', { status: filters.status });
    if (filters.student_id) qb.andWhere('app.student_id = :sid', { sid: filters.student_id });
    if (filters.assigned_to_user_id) qb.andWhere('app.assigned_to_user_id = :uid', { uid: filters.assigned_to_user_id });
    if (filters.search) {
      qb.andWhere(
        '(student.name ILIKE :q OR student.student_id ILIKE :q OR app.university_name ILIKE :q OR app.course_name ILIKE :q)',
        { q: `%${filters.search}%` },
      );
    }
    const apps = await qb.take(1000).getMany();
    return apps.map((a) => this.present(a));
  }

  async summary() {
    const rows: { status: string; count: string }[] = await this.applicationsRepository
      .createQueryBuilder('app')
      .select('app.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('app.status')
      .getRawMany();
    const counts: Record<string, number> = {};
    for (const s of APPLICATION_STATUSES) counts[s] = 0;
    for (const r of rows) counts[r.status] = Number(r.count);
    return { counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
  }

  async listForStudent(studentId: number) {
    await this.assertStudent(studentId);
    return this.list({ student_id: studentId });
  }

  private async assertStudent(studentId: number) {
    const count = await this.studentsRepository.count({ where: { id: studentId } });
    if (count === 0) throw new NotFoundException(`Student ${studentId} not found.`);
  }

  async create(studentId: number, dto: CreateApplicationDto, userId: number) {
    await this.assertStudent(studentId);
    const status = dto.status || 'draft';
    const app = this.applicationsRepository.create({
      student_id: studentId,
      university_name: dto.university_name.trim(),
      course_name: dto.course_name.trim(),
      course_level: dto.course_level ?? null,
      intake: dto.intake ?? null,
      country_id: dto.country_id ?? null,
      application_fee: dto.application_fee ?? null,
      application_fee_currency: dto.application_fee_currency ?? null,
      tuition_fee: dto.tuition_fee ?? null,
      university_reference: dto.university_reference ?? null,
      notes: dto.notes ?? null,
      assigned_to_user_id: dto.assigned_to_user_id ?? userId,
      created_by_user_id: userId,
      status,
      submitted_at: status === 'submitted' ? today() : null,
    });
    const saved = await this.applicationsRepository.save(app);
    await this.historyRepository.save(
      this.historyRepository.create({
        application_id: saved.id,
        from_status: null,
        to_status: status,
        note: 'Application created',
        changed_by_user_id: userId,
      }),
    );
    return this.findOne(saved.id);
  }

  async findOne(id: number) {
    const app = await this.applicationsRepository.findOne({
      where: { id },
      relations: { student: true, country: true, assigned_to: true },
    });
    if (!app) throw new NotFoundException(`Application ${id} not found.`);
    const history = await this.historyRepository.find({
      where: { application_id: id },
      relations: { changed_by: true },
      order: { created_at: 'DESC', id: 'DESC' },
    });
    return {
      ...this.present(app),
      history: history.map((h) => ({
        id: h.id,
        from_status: h.from_status,
        to_status: h.to_status,
        note: h.note,
        changed_by: h.changed_by ? h.changed_by.full_name || h.changed_by.username : null,
        created_at: h.created_at,
      })),
    };
  }

  async update(id: number, dto: UpdateApplicationDto) {
    const app = await this.applicationsRepository.findOne({ where: { id } });
    if (!app) throw new NotFoundException(`Application ${id} not found.`);
    const fields: (keyof UpdateApplicationDto)[] = [
      'university_name',
      'course_name',
      'course_level',
      'intake',
      'country_id',
      'application_fee',
      'application_fee_currency',
      'tuition_fee',
      'university_reference',
      'submitted_at',
      'decision_at',
      'notes',
      'assigned_to_user_id',
    ];
    for (const f of fields) {
      if (dto[f] !== undefined) (app as any)[f] = dto[f];
    }
    if (!app.university_name?.trim() || !app.course_name?.trim()) {
      throw new BadRequestException('University and course are required.');
    }
    await this.applicationsRepository.save(app);
    return this.findOne(id);
  }

  async changeStatus(id: number, dto: ChangeApplicationStatusDto, userId: number) {
    const app = await this.applicationsRepository.findOne({ where: { id } });
    if (!app) throw new NotFoundException(`Application ${id} not found.`);
    if (app.status === dto.status) {
      throw new BadRequestException(`Application is already "${dto.status}".`);
    }
    const from = app.status;
    app.status = dto.status;
    if (dto.status === 'submitted' && !app.submitted_at) app.submitted_at = today();
    if (DECISION_STATUSES.has(dto.status) && !app.decision_at) app.decision_at = today();
    await this.applicationsRepository.save(app);
    await this.historyRepository.save(
      this.historyRepository.create({
        application_id: id,
        from_status: from,
        to_status: dto.status,
        note: dto.note?.trim() || null,
        changed_by_user_id: userId,
      }),
    );
    return this.findOne(id);
  }

  async remove(id: number) {
    const result = await this.applicationsRepository.delete(id);
    if (!result.affected) throw new NotFoundException(`Application ${id} not found.`);
    return { success: true };
  }
}
