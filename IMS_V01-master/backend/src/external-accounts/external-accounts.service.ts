import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalAccount } from '../entities/external-account.entity';
import { Student } from '../entities/student.entity';
import { LinkExternalAccountDto } from './dto/link-external-account.dto';

export interface ExternalSystem {
  key: string;
  label: string;
  lookupUrl: string | null;
  apiKey: string | null;
  profileUrl: string | null; // may contain {id}
  signupUrl: string | null;
}

/**
 * Links IMS students to their accounts in other nextED systems.
 *
 * Systems come from .env:
 *   EXTERNAL_SYSTEMS=nexted_platform:NextEd Platform,ielts_ai:IELTS AI by nextED
 * and, optionally, per system (KEY = upper-cased system key):
 *   EXTERNAL_<KEY>_LOOKUP_URL   GET endpoint, called as ?phone=...&email=...
 *                               must answer { "found": true, "id": "...", "email": "..." }
 *   EXTERNAL_<KEY>_API_KEY      sent as "Authorization: Bearer <key>"
 *   EXTERNAL_<KEY>_PROFILE_URL  e.g. https://crm.nexted.app/students/{id}
 *   EXTERNAL_<KEY>_SIGNUP_URL   page where staff can create the account manually
 */
@Injectable()
export class ExternalAccountsService {
  private readonly logger = new Logger(ExternalAccountsService.name);
  private readonly systems: ExternalSystem[];

  constructor(
    @InjectRepository(ExternalAccount)
    private readonly accountsRepository: Repository<ExternalAccount>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    config: ConfigService,
  ) {
    const raw = config.get<string>('EXTERNAL_SYSTEMS') || 'nexted_platform:NextEd Platform,ielts_ai:IELTS AI by nextED';
    this.systems = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [keyRaw, ...labelParts] = part.split(':');
        const key = keyRaw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const env = (name: string) => config.get<string>(`EXTERNAL_${key.toUpperCase()}_${name}`) || null;
        return {
          key,
          label: labelParts.join(':').trim() || key,
          lookupUrl: env('LOOKUP_URL'),
          apiKey: env('API_KEY'),
          profileUrl: env('PROFILE_URL'),
          signupUrl: env('SIGNUP_URL'),
        };
      });
  }

  listSystems() {
    return this.systems.map((s) => ({
      key: s.key,
      label: s.label,
      can_lookup: !!s.lookupUrl,
      signup_url: s.signupUrl,
    }));
  }

  private getSystem(key: string): ExternalSystem {
    const system = this.systems.find((s) => s.key === key);
    if (!system) throw new BadRequestException(`Unknown system "${key}". Configure it in EXTERNAL_SYSTEMS.`);
    return system;
  }

  private async getStudent(studentId: number): Promise<Student> {
    const student = await this.studentsRepository.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException(`Student ${studentId} not found.`);
    return student;
  }

  /** One row per configured system: linked account (if any) and helpful links. */
  async listForStudent(studentId: number) {
    await this.getStudent(studentId);
    const accounts = await this.accountsRepository.find({
      where: { student_id: studentId },
      relations: { linked_by: true },
    });
    return this.systems.map((system) => {
      const acc = accounts.find((a) => a.system === system.key);
      return {
        system: system.key,
        label: system.label,
        can_lookup: !!system.lookupUrl,
        signup_url: system.signupUrl,
        account: acc
          ? {
              id: acc.id,
              external_id: acc.external_id,
              external_email: acc.external_email,
              note: acc.note,
              profile_url: system.profileUrl ? system.profileUrl.replace('{id}', encodeURIComponent(acc.external_id)) : null,
              linked_by: acc.linked_by ? acc.linked_by.full_name || acc.linked_by.username : null,
              created_at: acc.created_at,
            }
          : null,
      };
    });
  }

  async link(studentId: number, dto: LinkExternalAccountDto, userId: number) {
    await this.getStudent(studentId);
    const system = this.getSystem(dto.system);
    const existing = await this.accountsRepository.findOne({ where: { student_id: studentId, system: system.key } });
    if (existing) {
      throw new ConflictException(`This student is already linked to ${system.label}. Unlink it first.`);
    }
    await this.accountsRepository.save(
      this.accountsRepository.create({
        student_id: studentId,
        system: system.key,
        external_id: dto.external_id.trim(),
        external_email: dto.external_email?.trim() || null,
        note: dto.note?.trim() || null,
        linked_by_user_id: userId,
      }),
    );
    return this.listForStudent(studentId);
  }

  async unlink(studentId: number, accountId: number) {
    const result = await this.accountsRepository.delete({ id: accountId, student_id: studentId });
    if (!result.affected) throw new NotFoundException('Linked account not found.');
    return this.listForStudent(studentId);
  }

  /** Ask every system that has a LOOKUP_URL whether this student already has an account. */
  async lookup(studentId: number) {
    const student = await this.getStudent(studentId);
    const phone = `${student.phone_country_code || ''}${student.phone_number || ''}`;
    const results: any[] = [];

    for (const system of this.systems) {
      if (!system.lookupUrl) {
        results.push({ system: system.key, label: system.label, checked: false, reason: 'No lookup URL configured' });
        continue;
      }
      try {
        const url = new URL(system.lookupUrl);
        url.searchParams.set('phone', phone);
        if (student.email) url.searchParams.set('email', student.email);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url.toString(), {
          headers: system.apiKey ? { Authorization: `Bearer ${system.apiKey}` } : {},
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: any = await res.json();
        results.push({
          system: system.key,
          label: system.label,
          checked: true,
          found: !!data?.found,
          external_id: data?.id != null ? String(data.id) : null,
          external_email: data?.email ?? null,
          name: data?.name ?? null,
        });
      } catch (err: any) {
        this.logger.warn(`Lookup in ${system.key} failed: ${err?.message}`);
        results.push({ system: system.key, label: system.label, checked: false, reason: 'Lookup failed' });
      }
    }
    return results;
  }
}
