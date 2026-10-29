import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../entities/student.entity';
import { Sequence } from '../entities/sequence.entity';
import { Invoice } from '../entities/invoice.entity';
import { Country } from '../entities/country.entity';
import { StudentInfo } from '../entities/student-info.entity';
import { Employee } from '../entities/employee.entity';
import { Counselor } from '../entities/counselor.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CreateStudentInfoDto } from './dto/create-student-info.dto';
import { StudentFollowUp } from '../entities/student-follow-up.entity';


@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(Sequence)
    private sequencesRepository: Repository<Sequence>,
    @InjectRepository(Invoice)
    private invoicesRepository: Repository<Invoice>,
    @InjectRepository(Country)
    private countriesRepository: Repository<Country>,
    @InjectRepository(StudentInfo)
    private studentInfoRepository: Repository<StudentInfo>,
    @InjectRepository(Employee)
    private employeesRepository: Repository<Employee>,
    @InjectRepository(Counselor)
    private counselorsRepository: Repository<Counselor>,
    @InjectRepository(StudentFollowUp)
    private studentFollowUpsRepository: Repository<StudentFollowUp>,
  ) {}


  private getPrefix(name: string): string {
    if (!name) return 'Xxx';
    // Remove non-alphabetical characters and get first 3 characters
    const cleanName = name.replace(/[^a-zA-Z]/g, '');
    const part = cleanName.substring(0, 3);
    if (part.length === 0) return 'Xxx';
    // Capitalize first letter, lower case the rest
    return part.charAt(0).toUpperCase() + part.substring(1).toLowerCase();
  }

  async create(createStudentDto: CreateStudentDto): Promise<Student> {
    // 1. Generate Counselor and Source prefix
    const sourcePrefix = this.getPrefix(createStudentDto.source_name);
    const counselorPrefix = this.getPrefix(createStudentDto.counselor_name);

    // 2. Safely increment sequence value in a dedicated sequence tracker
    let seq = await this.sequencesRepository.findOne({ where: { key: 'student_id' } });
    if (!seq) {
      seq = this.sequencesRepository.create({ key: 'student_id', value: 1 });
    } else {
      seq.value += 1;
    }
    await this.sequencesRepository.save(seq);

    // 3. Format sequence number zero-padded to 3 digits (e.g. 001, 002... 999, 1000)
    const paddedNumber = seq.value <= 999 
      ? String(seq.value).padStart(3, '0') 
      : String(seq.value);

    const generatedStudentId = `NextEd/${sourcePrefix}/${counselorPrefix}/${paddedNumber}`;

    // 4. Look up matching StudentInfo by name and phone number to copy the CV (if it exists)
    let cv_name: string | null = null;
    let cv_mime: string | null = null;
    let cv_data: Buffer | null = null;

    try {
      const matchingInfo = await this.studentInfoRepository.findOne({
        where: {
          name: createStudentDto.name,
          phone_number: createStudentDto.phone_number,
        },
        select: { id: true, cv_name: true, cv_mime: true, cv_data: true },
      });
      if (matchingInfo) {
        cv_name = matchingInfo.cv_name || null;
        cv_mime = matchingInfo.cv_mime || null;
        cv_data = (matchingInfo as any).cv_data || null;
      }
    } catch (err) {
      console.error('Failed to look up matching student info for CV copy:', err);
    }

    // 5. Save and return student
    const student = this.studentsRepository.create({
      ...createStudentDto,
      student_id: generatedStudentId,
      date_of_opening: new Date(createStudentDto.date_of_opening),
      follow_up_date: createStudentDto.follow_up_date ? new Date(createStudentDto.follow_up_date) : null,
      follow_up_note: createStudentDto.follow_up_note || null,
      status: createStudentDto.status || 'Registered',
      cv_name: cv_name || undefined,
      cv_mime: cv_mime || undefined,
    });
    if (cv_data) {
      (student as any).cv_data = cv_data;
    }

    const savedStudent = await this.studentsRepository.save(student);

    if (createStudentDto.follow_up_date) {
      const followUp = this.studentFollowUpsRepository.create({
        student_id: savedStudent.id,
        follow_up_date: new Date(createStudentDto.follow_up_date),
        notes: createStudentDto.follow_up_note || '',
      });
      await this.studentFollowUpsRepository.save(followUp);
    }

    return savedStudent;
  }


  async findAll(name?: string, invoiceId?: string): Promise<any[]> {
    const qb = this.studentsRepository.createQueryBuilder('student')
      .leftJoinAndSelect('student.country', 'country');

    if (name) {
      qb.andWhere('student.name ILIKE :name', { name: `%${name}%` });
    }

    if (invoiceId) {
      qb.innerJoin('invoices', 'invoice', 'invoice.student_id = student.id')
        .andWhere('invoice.invoice_id ILIKE :invoiceId', { invoiceId: `%${invoiceId}%` });
    }

    qb.orderBy('student.created_at', 'DESC');
    const students = await qb.getMany();

    // Map to include invoice count and due status
    const results = await Promise.all(
      students.map(async (student) => {
        const invoices = await this.invoicesRepository.find({
          where: { student_id: student.id },
          order: { id: 'DESC' },
        });
        const invoiceCount = invoices.length;

        // hasDue: latest invoice has outstanding due, or no invoices yet but file fee > 0
        let hasDue = false;
        if (invoices.length > 0) {
          hasDue = (invoices[0].due_amount_bdt ?? 0) > 0;
        } else {
          hasDue = (student.file_opening_fee_bdt ?? 0) > 0;
        }

        return {
          id: student.id,
          student_id: student.student_id,
          name: student.name,
          phone_country_code: student.phone_country_code,
          phone_number: student.phone_number,
          invoiceCount,
          hasDue,
          follow_up_date: student.follow_up_date,
          follow_up_note: student.follow_up_note,
          status: student.status,
        };
      })
    );

    return results;
  }


  async findOne(id: number): Promise<any> {
    const student = await this.studentsRepository.findOne({
      where: { id },
      relations: { country: true, follow_ups: true },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found.`);
    }

    // Load full invoice history for details ordered by sequential ID
    const invoices = await this.invoicesRepository.find({
      where: { student_id: student.id },
      order: { id: 'DESC' },
      relations: { country: true },
    });


    const latestInvoice = invoices.length > 0 ? invoices[0] : null;
    const previous_due = latestInvoice
      ? latestInvoice.due_amount_bdt
      : student.file_opening_fee_bdt;
    const previous_total = latestInvoice
      ? latestInvoice.total_amount_bdt
      : student.file_opening_fee_bdt;

    return {
      ...student,
      invoices,
      previous_due,
      previous_total,
    };
  }

  async update(id: number, updateStudentDto: UpdateStudentDto): Promise<Student> {
    const student = await this.studentsRepository.findOne({ where: { id } });
    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found.`);
    }

    const { follow_up_date, follow_up_note, status, ...rest } = updateStudentDto;
    Object.assign(student, rest);

    if (status !== undefined) {
      student.status = status;
    }

    if (follow_up_date !== undefined) {
      const newDate = follow_up_date ? new Date(follow_up_date) : null;
      student.follow_up_date = newDate;
      if (newDate) {
        student.follow_up_note = follow_up_note || null;
        // Save follow up history
        const followUp = this.studentFollowUpsRepository.create({
          student_id: student.id,
          follow_up_date: newDate,
          notes: follow_up_note || '',
        });
        await this.studentFollowUpsRepository.save(followUp);
      } else {
        student.follow_up_note = null;
      }
    }

    return this.studentsRepository.save(student);
  }


  async createInfo(createStudentInfoDto: CreateStudentInfoDto): Promise<StudentInfo> {
    const { cv_data, ...rest } = createStudentInfoDto;
    const studentInfo = this.studentInfoRepository.create(rest);
    if (cv_data) {
      (studentInfo as any).cv_data = Buffer.from(cv_data, 'base64');
    }
    return this.studentInfoRepository.save(studentInfo);
  }

  async findAllInfo(name?: string): Promise<any[]> {
    const qb = this.studentInfoRepository.createQueryBuilder('info');
    if (name) {
      qb.andWhere('info.name ILIKE :name', { name: `%${name}%` });
    }
    qb.orderBy('info.created_at', 'DESC');
    const infoList = await qb.getMany();

    // Build a set of registered students keyed by normalized phone+name
    const allRegistered = await this.studentsRepository.find();
    const normalizePhone = (cc: string, ph: string) =>
      `${(cc || '').replace(/\D/g, '')}${(ph || '').replace(/\D/g, '')}`;
    const normalizeName = (n: string) =>
      (n || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const registeredKeys = new Set<string>();
    for (const reg of allRegistered) {
      registeredKeys.add(
        `${normalizePhone(reg.phone_country_code, reg.phone_number)}_${normalizeName(reg.name)}`
      );
    }

    return infoList.map((info) => {
      const key = `${normalizePhone(info.phone_country_code, info.phone_number)}_${normalizeName(info.name)}`;
      return { ...info, isRegistered: registeredKeys.has(key) };
    });
  }

  async findOneInfo(id: number): Promise<StudentInfo> {
    const info = await this.studentInfoRepository.findOne({ where: { id } });
    if (!info) {
      throw new NotFoundException(`Student information record with ID ${id} not found.`);
    }
    return info;
  }

  async getPerformanceDashboard(month?: string): Promise<any> {
    const allWalkins = await this.studentInfoRepository.find();
    const allRegistrations = await this.studentsRepository.find();

    const employees = await this.employeesRepository.find({ order: { name: 'ASC' } });
    const counselors = await this.counselorsRepository.find({ order: { name: 'ASC' } });

    // ── Collect available months from both tables ──────────────────────────────
    const uniqueMonths = new Set<string>();
    uniqueMonths.add(new Date().toISOString().substring(0, 7)); // always include current month
    for (const w of allWalkins) {
      if (w.created_at) uniqueMonths.add(new Date(w.created_at).toISOString().substring(0, 7));
    }
    for (const r of allRegistrations) {
      if (r.date_of_opening) uniqueMonths.add(new Date(r.date_of_opening).toISOString().substring(0, 7));
    }
    const availableMonths = Array.from(uniqueMonths).sort().reverse();

    // ── Apply month filter ──────────────────────────────────────────────────────
    let filteredWalkins = allWalkins;
    let filteredRegistrations = allRegistrations;

    if (month && month !== 'all') {
      const [yearStr, monthStr] = month.split('-');
      const targetYear  = parseInt(yearStr);
      const targetMonth = parseInt(monthStr) - 1; // JS months are 0-indexed

      filteredWalkins = allWalkins.filter(w => {
        const d = new Date(w.created_at);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      });

      filteredRegistrations = allRegistrations.filter(r => {
        const d = new Date(r.date_of_opening);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      });
    }

    // ── Phone normalisation helper (used only for display-list deduplication) ──
    const normalizePhone = (countryCode: string, phone: string) => {
      return `${(countryCode || '').replace(/\D/g, '')}${(phone || '').replace(/\D/g, '')}`;
    };

    // ── Name normalisation helper ──
    const normalizeName = (name: string) => {
      return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    // Build phone + name → registration map (from ALL registrations, not filtered),
    // so the detail list can mark a walk-in student as registered even if they
    // registered in a different month than the walk-in.
    const registeredByPhoneAndName = new Map<string, Student>();
    for (const reg of allRegistrations) {
      const key = `${normalizePhone(reg.phone_country_code, reg.phone_number)}_${normalizeName(reg.name)}`;
      registeredByPhoneAndName.set(key, reg);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SOURCE PERFORMANCE
    // Walk-ins (students_brought) = student_info rows for this source
    // Files opened (files_opened) = student rows (registrations) for this source
    // ══════════════════════════════════════════════════════════════════════════

    const sourceData = new Map<string, {
      source_name: string;
      source_type: string;
      students_brought: number;
      files_opened: number;
      students: any[];
    }>();

    // Seed known sources so they always appear even with zero counts
    for (const emp of employees) {
      sourceData.set(emp.name, { source_name: emp.name, source_type: 'employee', students_brought: 0, files_opened: 0, students: [] });
    }
    for (const platform of ['Facebook', 'Instagram', 'LinkedIn']) {
      sourceData.set(platform, { source_name: platform, source_type: 'social_media', students_brought: 0, files_opened: 0, students: [] });
    }

    // Count walk-ins per source — each student_info row is ONE walk-in
    for (const walkin of filteredWalkins) {
      if (!walkin.source_name) continue;
      let row = sourceData.get(walkin.source_name);
      if (!row) {
        row = { source_name: walkin.source_name, source_type: walkin.source_type || 'employee', students_brought: 0, files_opened: 0, students: [] };
        sourceData.set(walkin.source_name, row);
      }
      row.students_brought += 1;

      // For the student list: check if this walk-in person is ALSO registered (any time)
      const phoneNameKey = `${normalizePhone(walkin.phone_country_code, walkin.phone_number)}_${normalizeName(walkin.name)}`;
      const matchedReg = registeredByPhoneAndName.get(phoneNameKey);
      if (matchedReg) {
        row.students.push({ id: matchedReg.id, student_id: matchedReg.student_id, name: matchedReg.name, date: walkin.created_at, type: 'registered' });
      } else {
        row.students.push({ id: walkin.id, student_id: null, name: walkin.name, date: walkin.created_at, type: 'collected' });
      }
    }

    // Track which phone+name combinations already appear in the walk-in list
    const walkinPhoneNames = new Set<string>(
      filteredWalkins.map(w => `${normalizePhone(w.phone_country_code, w.phone_number)}_${normalizeName(w.name)}`)
    );

    // Count file opens per source — each student row is ONE file opened
    for (const reg of filteredRegistrations) {
      if (!reg.source_name) continue;
      let row = sourceData.get(reg.source_name);
      if (!row) {
        row = { source_name: reg.source_name, source_type: reg.source_type || 'employee', students_brought: 0, files_opened: 0, students: [] };
        sourceData.set(reg.source_name, row);
      }
      row.files_opened += 1;

      // Add to student list only if this person was NOT already listed via walk-in
      const phoneNameKey = `${normalizePhone(reg.phone_country_code, reg.phone_number)}_${normalizeName(reg.name)}`;
      if (!walkinPhoneNames.has(phoneNameKey)) {
        row.students.push({ id: reg.id, student_id: reg.student_id, name: reg.name, date: reg.date_of_opening, type: 'registered' });
      }
    }

    // Deduplication helper: if the same registered student appears multiple times
    // (e.g. the student filled the info form more than once), keep only one entry.
    // Registered entries always win over collected entries for the same person.
    const deduplicateStudents = (students: any[]): any[] => {
      const seen = new Map<string, any>();
      for (const s of students) {
        // Key by student_id when registered, otherwise by walkin id
        const key = s.type === 'registered' ? `reg-${s.id}` : `col-${s.id}`;
        if (!seen.has(key)) {
          seen.set(key, s);
        }
      }
      return Array.from(seen.values());
    };

    const sourcePerformance = Array.from(sourceData.values()).map(item => {
      const ratio = item.students_brought > 0
        ? Math.round((item.files_opened / item.students_brought) * 1000) / 10
        : 0;
      const deduped = deduplicateStudents(item.students);
      deduped.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return { ...item, students: deduped, ratio };
    });

    // ══════════════════════════════════════════════════════════════════════════
    // COUNSELOR PERFORMANCE
    // students_counseled = student_info rows for this counselor
    // files_opened       = student rows (registrations) for this counselor
    // ══════════════════════════════════════════════════════════════════════════

    const counselorData = new Map<string, {
      counselor_name: string;
      students_counseled: number;
      files_opened: number;
      students: any[];
    }>();

    // Seed known counselors
    for (const c of counselors) {
      counselorData.set(c.name, { counselor_name: c.name, students_counseled: 0, files_opened: 0, students: [] });
    }

    // Count walk-ins per counselor
    for (const walkin of filteredWalkins) {
      if (!walkin.counselor_name) continue;
      let row = counselorData.get(walkin.counselor_name);
      if (!row) {
        row = { counselor_name: walkin.counselor_name, students_counseled: 0, files_opened: 0, students: [] };
        counselorData.set(walkin.counselor_name, row);
      }
      row.students_counseled += 1;

      const phoneNameKey = `${normalizePhone(walkin.phone_country_code, walkin.phone_number)}_${normalizeName(walkin.name)}`;
      const matchedReg = registeredByPhoneAndName.get(phoneNameKey);
      if (matchedReg) {
        row.students.push({ id: matchedReg.id, student_id: matchedReg.student_id, name: matchedReg.name, date: walkin.created_at, type: 'registered' });
      } else {
        row.students.push({ id: walkin.id, student_id: null, name: walkin.name, date: walkin.created_at, type: 'collected' });
      }
    }

    const counselorWalkinPhoneNames = new Set<string>(
      filteredWalkins
        .filter(w => !!w.counselor_name)
        .map(w => `${normalizePhone(w.phone_country_code, w.phone_number)}_${normalizeName(w.name)}`)
    );

    // Count file opens per counselor
    for (const reg of filteredRegistrations) {
      if (!reg.counselor_name) continue;
      let row = counselorData.get(reg.counselor_name);
      if (!row) {
        row = { counselor_name: reg.counselor_name, students_counseled: 0, files_opened: 0, students: [] };
        counselorData.set(reg.counselor_name, row);
      }
      row.files_opened += 1;

      const phoneNameKey = `${normalizePhone(reg.phone_country_code, reg.phone_number)}_${normalizeName(reg.name)}`;
      if (!counselorWalkinPhoneNames.has(phoneNameKey)) {
        row.students.push({ id: reg.id, student_id: reg.student_id, name: reg.name, date: reg.date_of_opening, type: 'registered' });
      }
    }

    const counselorPerformance = Array.from(counselorData.values()).map(item => {
      const ratio = item.students_counseled > 0
        ? Math.round((item.files_opened / item.students_counseled) * 1000) / 10
        : 0;
      const deduped = deduplicateStudents(item.students);
      deduped.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return { ...item, students: deduped, ratio };
    });

    return {
      sourcePerformance,
      counselorPerformance,
      availableMonths,
      totalWalkins: filteredWalkins.length,
      totalOpened: filteredRegistrations.length,
    };
  }

  async findOneInfoWithCv(id: number): Promise<StudentInfo> {
    const info = await this.studentInfoRepository.findOne({
      where: { id },
      select: { id: true, cv_name: true, cv_mime: true, cv_data: true },
    });
    if (!info) {
      throw new NotFoundException(`Student information record with ID ${id} not found.`);
    }
    return info;
  }

  async findOneWithCv(id: number): Promise<Student> {
    const student = await this.studentsRepository.findOne({
      where: { id },
      select: { id: true, name: true, phone_number: true, cv_name: true, cv_mime: true, cv_data: true },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found.`);
    }
    return student;
  }

  async updateInfoCv(id: number, file: Express.Multer.File): Promise<StudentInfo> {
    const info = await this.studentInfoRepository.findOne({ where: { id } });
    if (!info) {
      throw new NotFoundException(`Student info with ID ${id} not found.`);
    }
    info.cv_name = file.originalname;
    info.cv_mime = file.mimetype;
    (info as any).cv_data = file.buffer;
    const savedInfo = await this.studentInfoRepository.save(info);

    // Sync to registered student if exists (match by name & phone)
    const matchingStudent = await this.studentsRepository.findOne({
      where: {
        name: info.name,
        phone_number: info.phone_number,
      },
    });
    if (matchingStudent) {
      matchingStudent.cv_name = file.originalname;
      matchingStudent.cv_mime = file.mimetype;
      (matchingStudent as any).cv_data = file.buffer;
      await this.studentsRepository.save(matchingStudent);
    }

    return savedInfo;
  }

  async updateStudentCv(id: number, file: Express.Multer.File): Promise<Student> {
    const student = await this.studentsRepository.findOne({ where: { id } });
    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found.`);
    }
    student.cv_name = file.originalname;
    student.cv_mime = file.mimetype;
    (student as any).cv_data = file.buffer;
    const savedStudent = await this.studentsRepository.save(student);

    // Sync to student info if exists (match by name & phone)
    const matchingInfo = await this.studentInfoRepository.findOne({
      where: {
        name: student.name,
        phone_number: student.phone_number,
      },
    });
    if (matchingInfo) {
      matchingInfo.cv_name = file.originalname;
      matchingInfo.cv_mime = file.mimetype;
      (matchingInfo as any).cv_data = file.buffer;
      await this.studentInfoRepository.save(matchingInfo);
    }

    return savedStudent;
  }
}

