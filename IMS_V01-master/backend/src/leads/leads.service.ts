import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Lead, LEAD_STATUSES } from '../entities/lead.entity';
import { LeadActivity } from '../entities/lead-activity.entity';
import { StudentInfo } from '../entities/student-info.entity';
import { Student } from '../entities/student.entity';
import { User } from '../entities/user.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AddLeadActivityDto } from './dto/add-activity.dto';
import { phoneKey } from '../common/phone.util';
import { SOURCE_CHANNELS } from '../common/source-channel';
import { MappedLead, mapLeadFields, parseDelimited } from './lead-field-mapper';
import { parseExcelLeadRows } from './excel-lead-parser';

export const SOURCE_LABELS: Record<string, string> = {
  meta_ads: 'Meta Ads',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  calling_team: 'Calling Team',
  reference: 'Reference',
  employee_reference: 'Employee Reference',
  walk_in: 'Walk-in',
  website: 'Website',
  other: 'Other',
};

export interface LeadFilters {
  status?: string;
  source_channel?: string;
  campaign_name?: string;
  assigned?: string; // 'me' | 'unassigned' | '<userId>'
  follow_up?: string; // 'today' | 'overdue'
  search?: string;
  page?: number;
  page_size?: number;
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly leadsRepository: Repository<Lead>,
    @InjectRepository(LeadActivity)
    private readonly activitiesRepository: Repository<LeadActivity>,
    @InjectRepository(StudentInfo)
    private readonly studentInfoRepository: Repository<StudentInfo>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // ────────────────────────────────────────────────────────────────────────
  // Read
  // ────────────────────────────────────────────────────────────────────────

  private present(lead: Lead) {
    return {
      id: lead.id,
      full_name: lead.full_name,
      phone_country_code: lead.phone_country_code,
      phone_number: lead.phone_number,
      email: lead.email,
      source_channel: lead.source_channel,
      source_label: SOURCE_LABELS[lead.source_channel] || lead.source_channel,
      source_detail: lead.source_detail,
      campaign_name: lead.campaign_name,
      campaign_id: lead.campaign_id,
      platform: lead.platform,
      adset_name: lead.adset_name,
      ad_id: lead.ad_id,
      ad_name: lead.ad_name,
      meta_lead_id: lead.meta_lead_id,
      meta_form_id: lead.meta_form_id,
      preferred_country: lead.preferred_country,
      preferred_course_level: lead.preferred_course_level,
      preferred_intake: lead.preferred_intake,
      status: lead.status,
      assigned_to_user_id: lead.assigned_to_user_id,
      assigned_to_name: lead.assigned_to ? lead.assigned_to.full_name || lead.assigned_to.username : null,
      next_follow_up_date: lead.next_follow_up_date,
      notes: lead.notes,
      student_info_id: lead.student_info_id,
      student_id: lead.student_id,
      source_created_at: lead.source_created_at,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
    };
  }

  async list(filters: LeadFilters, currentUserId: number) {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(200, Math.max(1, filters.page_size || 50));

    const qb = this.leadsRepository
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.assigned_to', 'assigned_to')
      .orderBy('lead.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (filters.status) qb.andWhere('lead.status = :status', { status: filters.status });
    if (filters.source_channel) qb.andWhere('lead.source_channel = :src', { src: filters.source_channel });
    if (filters.campaign_name) qb.andWhere('lead.campaign_name = :camp', { camp: filters.campaign_name });
    if (filters.assigned === 'me') qb.andWhere('lead.assigned_to_user_id = :me', { me: currentUserId });
    else if (filters.assigned === 'unassigned') qb.andWhere('lead.assigned_to_user_id IS NULL');
    else if (filters.assigned && /^\d+$/.test(filters.assigned)) {
      qb.andWhere('lead.assigned_to_user_id = :uid', { uid: Number(filters.assigned) });
    }
    if (filters.follow_up === 'today') qb.andWhere('lead.next_follow_up_date = CURRENT_DATE');
    if (filters.follow_up === 'overdue') {
      qb.andWhere('lead.next_follow_up_date < CURRENT_DATE').andWhere(`lead.status NOT IN ('converted', 'lost', 'not_interested')`);
    }
    if (filters.search) {
      const q = `%${filters.search}%`;
      const digits = filters.search.replace(/\D/g, '');
      qb.andWhere(
        new Brackets((w) => {
          w.where('lead.full_name ILIKE :q', { q })
            .orWhere('lead.email ILIKE :q', { q })
            .orWhere('lead.campaign_name ILIKE :q', { q });
          if (digits.length >= 4) w.orWhere('lead.phone_key LIKE :d', { d: `%${digits.slice(-10)}%` });
        }),
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return { items: items.map((l) => this.present(l)), total, page, page_size: pageSize };
  }

  async stats() {
    const byStatusRows: { status: string; count: string }[] = await this.leadsRepository
      .createQueryBuilder('lead')
      .select('lead.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('lead.status')
      .getRawMany();
    const by_status: Record<string, number> = {};
    for (const s of LEAD_STATUSES) by_status[s] = 0;
    for (const r of byStatusRows) by_status[r.status] = Number(r.count);

    const bySourceRows: { source: string; total: string; converted: string }[] = await this.leadsRepository
      .createQueryBuilder('lead')
      .select('lead.source_channel', 'source')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN lead.status = 'converted' THEN 1 ELSE 0 END)`, 'converted')
      .groupBy('lead.source_channel')
      .getRawMany();

    const byCampaignRows: { campaign: string; total: string; converted: string }[] = await this.leadsRepository
      .createQueryBuilder('lead')
      .select('lead.campaign_name', 'campaign')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN lead.status = 'converted' THEN 1 ELSE 0 END)`, 'converted')
      .where('lead.campaign_name IS NOT NULL')
      .groupBy('lead.campaign_name')
      .orderBy('total', 'DESC')
      .limit(20)
      .getRawMany();

    const overdue = await this.leadsRepository
      .createQueryBuilder('lead')
      .where('lead.next_follow_up_date < CURRENT_DATE')
      .andWhere(`lead.status NOT IN ('converted', 'lost', 'not_interested')`)
      .getCount();
    const dueToday = await this.leadsRepository
      .createQueryBuilder('lead')
      .where('lead.next_follow_up_date = CURRENT_DATE')
      .getCount();

    const total = Object.values(by_status).reduce((a, b) => a + b, 0);
    return {
      total,
      by_status,
      by_source: bySourceRows.map((r) => ({
        source_channel: r.source,
        label: SOURCE_LABELS[r.source] || r.source,
        total: Number(r.total),
        converted: Number(r.converted),
      })),
      by_campaign: byCampaignRows.map((r) => ({
        campaign_name: r.campaign,
        total: Number(r.total),
        converted: Number(r.converted),
      })),
      follow_ups: { overdue, due_today: dueToday },
    };
  }

  async findOne(id: number) {
    const lead = await this.leadsRepository.findOne({ where: { id }, relations: { assigned_to: true } });
    if (!lead) throw new NotFoundException(`Lead ${id} not found.`);
    const activities = await this.activitiesRepository.find({
      where: { lead_id: id },
      relations: { user: true },
      order: { created_at: 'DESC', id: 'DESC' },
    });
    const duplicates = lead.phone_key
      ? await this.leadsRepository
          .createQueryBuilder('lead')
          .where('lead.phone_key = :k', { k: lead.phone_key })
          .andWhere('lead.id != :id', { id })
          .orderBy('lead.created_at', 'DESC')
          .getMany()
      : [];
    return {
      ...this.present(lead),
      raw_payload: lead.raw_payload,
      activities: activities.map((a) => ({
        id: a.id,
        type: a.type,
        content: a.content,
        user: a.user ? a.user.full_name || a.user.username : 'System',
        created_at: a.created_at,
      })),
      duplicates: duplicates.map((d) => ({ id: d.id, full_name: d.full_name, status: d.status, created_at: d.created_at })),
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // Write
  // ────────────────────────────────────────────────────────────────────────

  private async log(leadId: number, type: string, content: string, userId: number | null) {
    await this.activitiesRepository.save(this.activitiesRepository.create({ lead_id: leadId, type, content, user_id: userId }));
  }

  private async userLabel(userId: number | null | undefined): Promise<string> {
    if (!userId) return 'nobody';
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    return user ? user.full_name || user.username : `user #${userId}`;
  }

  async create(dto: CreateLeadDto, userId: number | null) {
    const key = dto.phone_number ? phoneKey(dto.phone_country_code || '+880', dto.phone_number) : null;
    if (!key && !dto.email) {
      throw new BadRequestException('Give at least a phone number or an email so the lead can be contacted.');
    }
    if (key && !dto.allow_duplicate) {
      const existing = await this.leadsRepository.findOne({ where: { phone_key: key }, order: { created_at: 'DESC' } });
      if (existing) {
        throw new ConflictException({
          message: `A lead with this phone number already exists (${existing.full_name}, status: ${existing.status}).`,
          existing_lead_id: existing.id,
        });
      }
    }

    const lead = await this.leadsRepository.save(
      this.leadsRepository.create({
        full_name: dto.full_name.trim(),
        phone_country_code: dto.phone_country_code || '+880',
        phone_number: dto.phone_number || null,
        phone_key: key,
        email: dto.email?.trim() || null,
        source_channel: dto.source_channel,
        source_detail: dto.source_detail?.trim() || null,
        campaign_name: dto.campaign_name?.trim() || null,
        adset_name: dto.adset_name?.trim() || null,
        ad_name: dto.ad_name?.trim() || null,
        preferred_country: dto.preferred_country || null,
        preferred_course_level: dto.preferred_course_level || null,
        preferred_intake: dto.preferred_intake || null,
        notes: dto.notes?.trim() || null,
        assigned_to_user_id: dto.assigned_to_user_id ?? null,
        next_follow_up_date: dto.next_follow_up_date || null,
        status: 'new',
        created_by_user_id: userId,
      }),
    );
    await this.log(lead.id, 'system', `Lead created (${SOURCE_LABELS[lead.source_channel] || lead.source_channel})`, userId);
    if (lead.assigned_to_user_id) {
      await this.log(lead.id, 'assignment', `Assigned to ${await this.userLabel(lead.assigned_to_user_id)}`, userId);
    }
    return this.findOne(lead.id);
  }

  async update(id: number, dto: UpdateLeadDto, userId: number) {
    const lead = await this.leadsRepository.findOne({ where: { id } });
    if (!lead) throw new NotFoundException(`Lead ${id} not found.`);

    const simple: (keyof UpdateLeadDto)[] = [
      'full_name',
      'phone_country_code',
      'phone_number',
      'email',
      'source_channel',
      'source_detail',
      'campaign_name',
      'preferred_country',
      'preferred_course_level',
      'preferred_intake',
      'notes',
      'next_follow_up_date',
    ];
    for (const f of simple) {
      if (dto[f] !== undefined) (lead as any)[f] = dto[f] === '' ? null : dto[f];
    }
    if (dto.phone_number !== undefined || dto.phone_country_code !== undefined) {
      lead.phone_key = lead.phone_number ? phoneKey(lead.phone_country_code, lead.phone_number) : null;
    }

    if (dto.status !== undefined && dto.status !== lead.status) {
      await this.log(id, 'status_change', `Status: ${lead.status} → ${dto.status}`, userId);
      lead.status = dto.status;
    }
    if (dto.assigned_to_user_id !== undefined && dto.assigned_to_user_id !== lead.assigned_to_user_id) {
      lead.assigned_to_user_id = dto.assigned_to_user_id;
      await this.log(id, 'assignment', `Assigned to ${await this.userLabel(dto.assigned_to_user_id)}`, userId);
    }
    await this.leadsRepository.save(lead);
    return this.findOne(id);
  }

  async addActivity(id: number, dto: AddLeadActivityDto, userId: number) {
    const lead = await this.leadsRepository.findOne({ where: { id } });
    if (!lead) throw new NotFoundException(`Lead ${id} not found.`);
    await this.log(id, dto.type, dto.content.trim(), userId);

    let changed = false;
    if (dto.status && dto.status !== lead.status) {
      await this.log(id, 'status_change', `Status: ${lead.status} → ${dto.status}`, userId);
      lead.status = dto.status;
      changed = true;
    } else if (dto.type === 'call' && lead.status === 'new') {
      lead.status = 'contacted';
      changed = true;
    }
    if (dto.next_follow_up_date !== undefined) {
      lead.next_follow_up_date = dto.next_follow_up_date || null;
      changed = true;
    }
    if (changed) await this.leadsRepository.save(lead);
    return this.findOne(id);
  }

  async bulkAssign(ids: number[], assignedToUserId: number | null, userId: number) {
    if (!ids.length) return { updated: 0 };
    const label = await this.userLabel(assignedToUserId);
    for (const id of ids) {
      const lead = await this.leadsRepository.findOne({ where: { id } });
      if (!lead || lead.assigned_to_user_id === assignedToUserId) continue;
      lead.assigned_to_user_id = assignedToUserId;
      await this.leadsRepository.save(lead);
      await this.log(id, 'assignment', `Assigned to ${label}`, userId);
    }
    return { updated: ids.length };
  }

  async remove(id: number) {
    const result = await this.leadsRepository.delete(id);
    if (!result.affected) throw new NotFoundException(`Lead ${id} not found.`);
    return { success: true };
  }

  /**
   * Turn a lead into a "collected info" record (student_info) so the
   * counsellor can continue with the normal flow (fill details → register).
   */
  async convert(id: number, userId: number) {
    const lead = await this.leadsRepository.findOne({ where: { id } });
    if (!lead) throw new NotFoundException(`Lead ${id} not found.`);
    if (lead.student_info_id) {
      return { student_info_id: lead.student_info_id, already_converted: true };
    }
    if (!lead.phone_number) {
      throw new BadRequestException('Add the phone number before converting — the student form needs it.');
    }

    // Re-use an existing collected-info record with the same phone, if any.
    const match = await this.studentInfoRepository
      .createQueryBuilder('info')
      .where(`RIGHT(regexp_replace(coalesce(info.phone_country_code, '') || coalesce(info.phone_number, ''), '[^0-9]', '', 'g'), 10) = :key`, {
        key: lead.phone_key,
      })
      .orderBy('info.created_at', 'DESC')
      .getOne();

    let infoId: number;
    if (match) {
      infoId = match.id;
      if (!match.lead_id) {
        match.lead_id = lead.id;
        match.source_channel = match.source_channel || lead.source_channel;
        match.campaign_name = match.campaign_name || lead.campaign_name;
        await this.studentInfoRepository.save(match);
      }
    } else {
      const assigned = lead.assigned_to_user_id
        ? await this.usersRepository.findOne({ where: { id: lead.assigned_to_user_id }, relations: { counselor: true } })
        : null;
      const info = this.studentInfoRepository.create({
        name: lead.full_name,
        phone_country_code: lead.phone_country_code || '+880',
        phone_number: lead.phone_number as string,
        preferred_country: lead.preferred_country || undefined,
        preferred_course_level: lead.preferred_course_level || undefined,
        preferred_intake: lead.preferred_intake || undefined,
        counsellor_notes: lead.notes || undefined,
        counselor_name: assigned?.counselor?.name || undefined,
        counselor_id: assigned?.counselor_id ?? null,
        source_type: 'social_media',
        source_name: SOURCE_LABELS[lead.source_channel] || lead.source_channel,
        source_channel: lead.source_channel,
        campaign_name: lead.campaign_name,
        lead_id: lead.id,
      });
      infoId = (await this.studentInfoRepository.save(info)).id;
    }

    lead.student_info_id = infoId;
    lead.status = 'converted';
    await this.leadsRepository.save(lead);
    await this.log(id, 'conversion', `Converted to collected student info #${infoId}`, userId);
    return { student_info_id: infoId, already_converted: false };
  }

  // ────────────────────────────────────────────────────────────────────────
  // Automatic linking (called from StudentsService)
  // ────────────────────────────────────────────────────────────────────────

  private async findOpenLeadByPhone(countryCode: string, number: string): Promise<Lead | null> {
    const key = phoneKey(countryCode, number);
    if (!key) return null;
    return this.leadsRepository.findOne({ where: { phone_key: key }, order: { created_at: 'DESC' } });
  }

  /** A counsellor filled the collect-info form: link it to the matching lead. */
  async onStudentInfoCreated(info: StudentInfo): Promise<{ lead_id: number; source_channel: string; campaign_name: string | null } | null> {
    try {
      const lead = await this.findOpenLeadByPhone(info.phone_country_code, info.phone_number);
      if (!lead) return null;
      if (!lead.student_info_id) {
        lead.student_info_id = info.id;
        if (lead.status !== 'converted') {
          await this.log(lead.id, 'conversion', `Student info collected (#${info.id})`, null);
          lead.status = 'converted';
        }
        await this.leadsRepository.save(lead);
      }
      return { lead_id: lead.id, source_channel: lead.source_channel, campaign_name: lead.campaign_name };
    } catch (err: any) {
      this.logger.warn(`Lead link (student info ${info.id}) failed: ${err?.message}`);
      return null;
    }
  }

  /** A student was registered (file opened): link it to the matching lead. */
  async onStudentRegistered(student: Student): Promise<{ lead_id: number; source_channel: string; campaign_name: string | null } | null> {
    try {
      const lead = await this.findOpenLeadByPhone(student.phone_country_code, student.phone_number);
      if (!lead) return null;
      if (!lead.student_id) {
        lead.student_id = student.id;
        lead.status = 'converted';
        await this.leadsRepository.save(lead);
        await this.log(lead.id, 'conversion', `File opened — student ${student.student_id}`, null);
      }
      return { lead_id: lead.id, source_channel: lead.source_channel, campaign_name: lead.campaign_name };
    } catch (err: any) {
      this.logger.warn(`Lead link (student ${student.id}) failed: ${err?.message}`);
      return null;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Import (CSV / Meta)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Saves a mapped lead from Meta or an import. Returns null when it is a duplicate
   * (same Meta lead id, or same phone number already in the CRM).
   */
  async ingestMapped(
    mapped: MappedLead,
    defaults: { source_channel: string; raw?: Record<string, any> },
    userId: number | null,
  ): Promise<Lead | null> {
    if (mapped.meta_lead_id) {
      const exists = await this.leadsRepository.findOne({ where: { meta_lead_id: mapped.meta_lead_id } });
      if (exists) return null;
    }
    const key = mapped.phone_number ? phoneKey(mapped.phone_country_code, mapped.phone_number) : null;
    if (!key && !mapped.email) return null;
    if (key) {
      const dup = await this.leadsRepository.findOne({ where: { phone_key: key } });
      if (dup) {
        await this.log(
          dup.id,
          'system',
          `Same person came in again${mapped.campaign_name ? ` from campaign "${mapped.campaign_name}"` : ''}.`,
          null,
        );
        return null;
      }
    }

    const channelRaw = (mapped.source_channel || '').toLowerCase().replace(/[^a-z_]/g, '_');
    const channel = (SOURCE_CHANNELS as readonly string[]).includes(channelRaw) ? channelRaw : defaults.source_channel;

    const lead = await this.leadsRepository.save(
      this.leadsRepository.create({
        full_name: mapped.full_name || 'Unknown',
        phone_country_code: mapped.phone_country_code || '+880',
        phone_number: mapped.phone_number,
        phone_key: key,
        email: mapped.email,
        source_channel: channel,
        meta_lead_id: mapped.meta_lead_id,
        meta_form_id: mapped.meta_form_id,
        platform: mapped.platform,
        campaign_id: mapped.campaign_id,
        campaign_name: mapped.campaign_name,
        adset_name: mapped.adset_name,
        ad_id: mapped.ad_id,
        ad_name: mapped.ad_name,
        preferred_country: mapped.preferred_country,
        preferred_course_level: mapped.preferred_course_level,
        preferred_intake: mapped.preferred_intake,
        notes: mapped.extra_notes.length ? mapped.extra_notes.join('\n') : null,
        raw_payload: defaults.raw ?? null,
        source_created_at: mapped.source_created_at,
        status: 'new',
        created_by_user_id: userId,
      }),
    );
    await this.log(lead.id, 'system', `Lead imported (${SOURCE_LABELS[channel] || channel})`, userId);
    return lead;
  }

  async importFile(file: Express.Multer.File | undefined, sourceChannel: string, assignTo: number | null, userId: number) {
    if (!file) throw new BadRequestException('No file uploaded. Send a CSV or XLSX file in the "file" field.');
    if (!(SOURCE_CHANNELS as readonly string[]).includes(sourceChannel)) {
      throw new BadRequestException(`Unknown source "${sourceChannel}".`);
    }
    const extension = file.originalname.toLowerCase().split('.').pop();
    let rows: Record<string, string>[];
    if (extension === 'csv' || extension === 'tsv' || extension === 'txt') {
      rows = parseDelimited(file.buffer);
    } else if (extension === 'xlsx') {
      rows = await parseExcelLeadRows(file.buffer);
    } else {
      throw new BadRequestException('Unsupported file type. Upload a CSV, TSV, or Excel .xlsx file.');
    }
    if (rows.length === 0) throw new BadRequestException('The file has no data rows (first row must be the headers).');
    if (rows.length > 5000) throw new BadRequestException('Please import at most 5000 rows at a time.');

    let created = 0;
    let duplicates = 0;
    const errors: { row: number; message: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        const mapped = mapLeadFields(rows[i]);
        if (!mapped.full_name && !mapped.phone_number && !mapped.email) {
          errors.push({ row: i + 2, message: 'No name, phone or email found' });
          continue;
        }
        const lead = await this.ingestMapped(mapped, { source_channel: sourceChannel, raw: rows[i] }, userId);
        if (!lead) {
          duplicates++;
          continue;
        }
        if (assignTo) {
          lead.assigned_to_user_id = assignTo;
          await this.leadsRepository.save(lead);
        }
        created++;
      } catch (err: any) {
        errors.push({ row: i + 2, message: err?.message || 'Unknown error' });
      }
    }
    return { total_rows: rows.length, created, duplicates, errors: errors.slice(0, 50) };
  }

}
