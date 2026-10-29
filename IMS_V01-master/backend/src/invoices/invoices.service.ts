import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { Student } from '../entities/student.entity';
import { Sequence } from '../entities/sequence.entity';
import { Salary } from '../entities/salary.entity';
import { IOEntry } from '../entities/io-entry.entity';
import { Employee } from '../entities/employee.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateInternalInvoiceDto } from './dto/create-internal-invoice.dto';
import { PdfService } from './pdf.service';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

function getNextMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  const date = new Date(year, mon - 1, 1);
  date.setMonth(date.getMonth() + 1);
  const nextYear = date.getFullYear();
  const nextMon = String(date.getMonth() + 1).padStart(2, '0');
  return `${nextYear}-${nextMon}`;
}

@Injectable()
export class InvoicesService {
  private pdfStoragePath: string;

  constructor(
    @InjectRepository(Invoice)
    private invoicesRepository: Repository<Invoice>,
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(Sequence)
    private sequencesRepository: Repository<Sequence>,
    @InjectRepository(Salary)
    private salaryRepo: Repository<Salary>,
    @InjectRepository(IOEntry)
    private ioRepo: Repository<IOEntry>,
    @InjectRepository(Employee)
    private employeesRepo: Repository<Employee>,
    private pdfService: PdfService,
    configService: ConfigService,
  ) {
    this.pdfStoragePath = configService.get<string>('PDF_STORAGE_PATH') || 'storage/invoices';
  }

  async create(createInvoiceDto: CreateInvoiceDto, userId?: number): Promise<Invoice> {
    if (createInvoiceDto.collected_by_employee_id) {
      const employee = await this.employeesRepo.findOne({ where: { id: createInvoiceDto.collected_by_employee_id } });
      if (!employee) {
        throw new BadRequestException('Selected "Collected by" employee does not exist.');
      }
    }

    // 1. Fetch related Student record
    const student = await this.studentsRepository.findOne({
      where: { id: createInvoiceDto.student_id },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${createInvoiceDto.student_id} not found.`);
    }

    const latestInvoice = await this.invoicesRepository.findOne({
      where: { student_id: student.id },
      order: { id: 'DESC' },
    });

    // Determine if this is a company spend/disbursement transaction
    const isSpendTransaction = !!(createInvoiceDto.comment && createInvoiceDto.comment.includes('Spend'));

    let totalAmount: number;
    let dueAmount: number;
    let cumulativeApplicationFee: number;
    let cumulativeOtherFee: number;

    if (isSpendTransaction) {
      // Spend transactions: company disbursing from received student fees.
      // The student's outstanding due and running totals remain UNCHANGED.
      // We record paid_amount_bdt as the disbursed amount for tracking.
      const baseTotal = latestInvoice ? latestInvoice.total_amount_bdt : student.file_opening_fee_bdt;
      const baseDue = latestInvoice ? latestInvoice.due_amount_bdt : student.file_opening_fee_bdt;
      totalAmount = baseTotal;
      dueAmount = baseDue;
      cumulativeApplicationFee = latestInvoice?.application_fee_bdt || 0;
      cumulativeOtherFee = latestInvoice?.other_fee_bdt || 0;
    } else {
      // 2. Standard student payment receipt: calculate running Total and Due BDT amounts
      const baseTotal = latestInvoice ? latestInvoice.total_amount_bdt : student.file_opening_fee_bdt;
      const baseDue = latestInvoice ? latestInvoice.due_amount_bdt : student.file_opening_fee_bdt;
      const applicationFee = createInvoiceDto.application_fee_bdt || 0;
      const otherFee = createInvoiceDto.other_fee_bdt || 0;
      const addedFees = applicationFee + otherFee;
      cumulativeApplicationFee = (latestInvoice?.application_fee_bdt || 0) + applicationFee;
      cumulativeOtherFee = (latestInvoice?.other_fee_bdt || 0) + otherFee;
      totalAmount = baseTotal + addedFees;
      const payableAmount = baseDue + addedFees;

      // Guard: paid amount must not exceed outstanding due plus newly added fees
      if (createInvoiceDto.paid_amount_bdt! > payableAmount) {
        throw new BadRequestException(
          `Paid amount (${createInvoiceDto.paid_amount_bdt}) cannot exceed due amount (${payableAmount}).`
        );
      }

      dueAmount = payableAmount - createInvoiceDto.paid_amount_bdt!;
    }

    // 3. Global auto-incrementing invoice ID sequence (format: NextEd/INV/{number})
    let seq = await this.sequencesRepository.findOne({ where: { key: 'invoice_id' } });
    if (!seq) {
      seq = this.sequencesRepository.create({ key: 'invoice_id', value: 1 });
    } else {
      seq.value += 1;
    }
    await this.sequencesRepository.save(seq);

    const invoiceId = `NextEd/INV/${seq.value}`;

    // 4. Replace forward slashes with underscores for safe file names
    const safeInvoiceId = invoiceId.replace(/\//g, '_');
    const pdfFilename = `${safeInvoiceId}.pdf`;
    const pdfPath = path.join(this.pdfStoragePath, pdfFilename);

    // 5. Create and save the Database Invoice record
    const invoice = this.invoicesRepository.create({
      ...createInvoiceDto,
      invoice_id: invoiceId,
      application_fee_bdt: cumulativeApplicationFee,
      other_fee_bdt: cumulativeOtherFee,
      total_amount_bdt: totalAmount,
      due_amount_bdt: dueAmount,
      pdf_path: pdfPath,
      collected_by_employee_id: createInvoiceDto.collected_by_employee_id ?? null,
      created_by_user_id: userId ?? null,
    });

    const savedInvoice = await this.invoicesRepository.save(invoice);

    // Fetch the invoice with relations loaded for pdf layout rendering
    const populatedInvoice = await this.invoicesRepository.findOne({
      where: { id: savedInvoice.id },
      relations: { country: true },
    });

    let remainingAmount = 0;
    if (isSpendTransaction) {
      const studentInvoices = await this.invoicesRepository.find({
        where: { student_id: student.id },
      });

      const isApp = (createInvoiceDto.comment || '').includes('Application');
      if (isApp) {
        const appFeeReceived = studentInvoices
          .filter(inv => !(inv.comment && inv.comment.includes('Spend')))
          .reduce((max, inv) => Math.max(max, inv.application_fee_bdt || 0), 0);
        const appFeeSpent = studentInvoices
          .filter(inv => inv.comment === 'Application Fee Spend')
          .reduce((sum, inv) => sum + (inv.paid_amount_bdt || 0), 0);
        remainingAmount = appFeeReceived - appFeeSpent;
      } else {
        const otherFeeReceived = studentInvoices
          .filter(inv => !(inv.comment && inv.comment.includes('Spend')))
          .reduce((max, inv) => Math.max(max, inv.other_fee_bdt || 0), 0);
        const otherFeeSpent = studentInvoices
          .filter(inv => inv.comment === 'Other Fee Spend')
          .reduce((sum, inv) => sum + (inv.paid_amount_bdt || 0), 0);
        remainingAmount = otherFeeReceived - otherFeeSpent;
      }
    }

    // 6. Trigger Puppeteer PDF generation
    try {
      await this.pdfService.generateInvoicePdf(
        populatedInvoice,
        student.name,
        student.phone_country_code,
        student.phone_number,
        student.file_opening_fee_bdt,
        pdfPath,
        student.student_id,
        isSpendTransaction,
        remainingAmount,
      );
    } catch (e) {
      console.error('Puppeteer invoice PDF compilation failed. DB entry created but PDF file is missing:', e);
    }

    return savedInvoice;
  }

  async createInternal(createInternalInvoiceDto: CreateInternalInvoiceDto, userId?: number): Promise<Invoice> {
    const { amount, purpose, payer } = createInternalInvoiceDto;

    // 1. Global auto-incrementing internal invoice ID sequence (format: Next/Int/{number})
    let seq = await this.sequencesRepository.findOne({ where: { key: 'internal_invoice_id' } });
    if (!seq) {
      seq = this.sequencesRepository.create({ key: 'internal_invoice_id', value: 1 });
    } else {
      seq.value += 1;
    }
    await this.sequencesRepository.save(seq);

    const invoiceId = `Next/Int/${seq.value}`;

    // 2. Replace forward slashes with underscores for safe file names
    const safeInvoiceId = invoiceId.replace(/\//g, '_');
    const pdfFilename = `${safeInvoiceId}.pdf`;
    const pdfPath = path.join(this.pdfStoragePath, pdfFilename);

    // 3. Create and save the Database Invoice record
    const invoice = this.invoicesRepository.create({
      invoice_id: invoiceId,
      payer_name: payer,
      payer_phone_country_code: '',
      payer_phone_number: '',
      payment_method: 'cash',
      comment: purpose,
      total_amount_bdt: amount,
      paid_amount_bdt: amount,
      due_amount_bdt: 0,
      pdf_path: pdfPath,
      application_fee_bdt: 0,
      other_fee_bdt: 0,
      created_by_user_id: userId ?? null,
    });

    const savedInvoice = await this.invoicesRepository.save(invoice);

    // 4. Trigger Puppeteer PDF generation
    try {
      await this.pdfService.generateInvoicePdf(
        savedInvoice,
        '',      // studentName
        '',      // phoneCountryCode
        '',      // phoneNumber
        0,       // fileOpeningFeeBdt
        pdfPath,
        '',      // studentDisplayId
        false,   // isSpendTransaction
      );
    } catch (e) {
      console.error('Puppeteer internal invoice PDF compilation failed. DB entry created but PDF file is missing:', e);
    }

    return savedInvoice;
  }

  async getBalanceSheet(): Promise<any> {
    const students = await this.studentsRepository.find();
    const invoices = await this.invoicesRepository.find();

    // Group invoices by student_id
    const studentInvoicesMap: Record<number, Invoice[]> = {};
    const internalInvoices: Invoice[] = [];

    for (const inv of invoices) {
      if (inv.invoice_id.startsWith('Next/Int/')) {
        internalInvoices.push(inv);
      } else if (inv.student_id) {
        if (!studentInvoicesMap[inv.student_id]) {
          studentInvoicesMap[inv.student_id] = [];
        }
        studentInvoicesMap[inv.student_id].push(inv);
      }
    }

    let totalFileOpeningFeeReceived = 0;
    let totalApplicationFeeReceived = 0;
    let totalOtherFeeReceived = 0;
    let totalApplicationDisbursement = 0;
    let totalOtherDisbursement = 0;
    let totalFileOpeningFeeDue = 0;
    let totalApplicationFeeDue = 0;
    let totalOtherFeeDue = 0;

    const details: any[] = [];

    for (const student of students) {
      const studentInvoices = studentInvoicesMap[student.id] || [];
      studentInvoices.sort((a, b) => a.id - b.id);

      const stdInvoices = studentInvoices.filter(inv => !(inv.comment && inv.comment.includes('Spend')));
      const latestStdInvoice = stdInvoices[stdInvoices.length - 1] || null;

      const F = Number(student.file_opening_fee_bdt) || 0;
      const A = latestStdInvoice ? (Number(latestStdInvoice.application_fee_bdt) || 0) : 0;
      const O = latestStdInvoice ? (Number(latestStdInvoice.other_fee_bdt) || 0) : 0;

      const totalPaid = stdInvoices.reduce((sum, inv) => sum + (Number(inv.paid_amount_bdt) || 0), 0);

      const F_rec = Math.min(totalPaid, F);
      const F_due = F - F_rec;

      const rem1 = Math.max(0, totalPaid - F);
      const A_rec = Math.min(rem1, A);
      const A_due = A - A_rec;

      const rem2 = Math.max(0, rem1 - A);
      const O_rec = Math.min(rem2, O);
      const O_due = O - O_rec;

      const totalStudentDue = F_due + A_due + O_due;

      const appDisbursement = studentInvoices
        .filter(inv => inv.comment && inv.comment.trim().toLowerCase() === 'application fee spend')
        .reduce((sum, inv) => sum + (Number(inv.paid_amount_bdt) || 0), 0);

      const otherDisbursement = studentInvoices
        .filter(inv => inv.comment && inv.comment.trim().toLowerCase() === 'other fee spend')
        .reduce((sum, inv) => sum + (Number(inv.paid_amount_bdt) || 0), 0);

      totalFileOpeningFeeReceived += F_rec;
      totalApplicationFeeReceived += A_rec;
      totalOtherFeeReceived += O_rec;
      totalFileOpeningFeeDue += F_due;
      totalApplicationFeeDue += A_due;
      totalOtherFeeDue += O_due;
      totalApplicationDisbursement += appDisbursement;
      totalOtherDisbursement += otherDisbursement;

      details.push({
        id: student.id,
        studentId: student.student_id,
        name: student.name,
        fileOpeningFeeReceived: F_rec,
        fileOpeningFeeDue: F_due,
        applicationFeeReceived: A_rec,
        applicationFeeDue: A_due,
        otherFeeReceived: O_rec,
        otherFeeDue: O_due,
        applicationDisbursement: appDisbursement,
        otherDisbursement: otherDisbursement,
        totalDue: totalStudentDue,
      });
    }

    const totalInternalCost = internalInvoices.reduce((sum, inv) => sum + (Number(inv.paid_amount_bdt) || 0), 0);
    const totalFeeReceived = totalFileOpeningFeeReceived + totalApplicationFeeReceived + totalOtherFeeReceived;

    // Fetch all salaries and IO entries to compute employee due and salary outflow
    const salaries = await this.salaryRepo.find();
    const ioEntries = await this.ioRepo.find();

    const employees = new Set<string>([
      ...salaries.map((s) => s.employeeName),
      ...ioEntries.map((io) => io.employeeName),
    ]);

    let totalSalaryOutflow = 0;
    let totalEmployeeDue = 0;

    for (const empName of employees) {
      const empSalaries = salaries.filter((s) => s.employeeName === empName);
      const empIO = ioEntries.filter((io) => io.employeeName === empName);

      // Chronological simulation
      empSalaries.sort((a, b) => {
        if (a.month !== b.month) return a.month.localeCompare(b.month);
        return a.id - b.id;
      });

      const ioMap: Record<string, number> = {};
      for (const io of empIO) {
        ioMap[io.month] = (ioMap[io.month] || 0) + Number(io.amount);
      }

      const activeMonths = new Set<string>();
      for (const s of empSalaries) activeMonths.add(s.month);
      for (const io of empIO) activeMonths.add(io.month);

      if (activeMonths.size > 0) {
        const sortedMonths = Array.from(activeMonths).sort();
        const minMonth = sortedMonths[0];
        const maxMonth = sortedMonths[sortedMonths.length - 1];

        let currentMonth = minMonth;
        let currentDebt = 0;

        while (currentMonth <= maxMonth) {
          const ioTaken = ioMap[currentMonth] || 0;
          const monthSalaries = empSalaries.filter((s) => s.month === currentMonth);

          for (const s of monthSalaries) {
            const ioDeduction = currentDebt;
            const netSalary = Number(s.baseSalary) - ioDeduction;

            if (s.paid && netSalary > 0) {
              totalSalaryOutflow += netSalary;
            }

            currentDebt = Math.max(0, currentDebt - Number(s.baseSalary));
          }

          currentDebt += ioTaken;
          currentMonth = getNextMonth(currentMonth);
        }

        totalEmployeeDue += currentDebt;
      }
    }

    const totalDue = totalFileOpeningFeeDue + totalApplicationFeeDue + totalOtherFeeDue + totalEmployeeDue;

    return {
      summary: {
        totalFileOpeningFeeReceived,
        totalApplicationFeeReceived,
        totalOtherFeeReceived,
        totalFeeReceived,
        totalApplicationDisbursement,
        totalOtherDisbursement,
        totalInternalCost,
        totalSalaryOutflow,
        totalEmployeeDue,
        totalFileOpeningFeeDue,
        totalApplicationFeeDue,
        totalOtherFeeDue,
        totalDue,
      },
      details,
    };
  }

  async findAll(invoiceId?: string): Promise<any[]> {
    const qb = this.invoicesRepository.createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.student', 'student')
      .leftJoinAndSelect('invoice.country', 'country')
      .leftJoinAndSelect('invoice.collected_by', 'collected_by');

    if (invoiceId) {
      qb.andWhere('invoice.invoice_id ILIKE :invoiceId', { invoiceId: `%${invoiceId}%` });
    }

    qb.orderBy('invoice.created_at', 'DESC');
    const invoices = await qb.getMany();

    return invoices.map(inv => {
      let type = 'student';
      if (inv.invoice_id.startsWith('Next/Int/')) {
        type = 'internal';
      } else if (inv.comment && inv.comment.includes('Spend')) {
        type = 'disbursement';
      }
      return {
        id: inv.id,
        invoice_id: inv.invoice_id,
        studentName: inv.student ? inv.student.name : 'Unknown Student',
        created_at: inv.created_at,
        pdf_path: inv.pdf_path,
        type,
        payerName: inv.payer_name,
        comment: inv.comment,
        total_amount_bdt: inv.total_amount_bdt,
        paid_amount_bdt: inv.paid_amount_bdt,
        due_amount_bdt: inv.due_amount_bdt,
        collected_by_employee_id: inv.collected_by_employee_id,
        collectedByName: inv.collected_by ? inv.collected_by.name : null,
      };
    });
  }

  /**
   * Money collected per employee (student payments only — no internal costs,
   * no disbursements). month = 'YYYY-MM' or 'all'.
   */
  async getCollectionsByEmployee(month?: string) {
    const qb = this.invoicesRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.collected_by', 'employee')
      .select('invoice.collected_by_employee_id', 'employee_id')
      .addSelect('employee.name', 'employee_name')
      .addSelect('COUNT(*)', 'invoice_count')
      .addSelect('COALESCE(SUM(invoice.paid_amount_bdt), 0)', 'total_collected_bdt')
      .where(`invoice.invoice_id NOT LIKE 'Next/Int/%'`)
      .andWhere(`(invoice.comment IS NULL OR invoice.comment NOT LIKE '%Spend%')`)
      .groupBy('invoice.collected_by_employee_id')
      .addGroupBy('employee.name')
      .orderBy('total_collected_bdt', 'DESC');

    if (month && month !== 'all') {
      if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('month must look like 2026-10');
      qb.andWhere(`to_char(invoice.created_at, 'YYYY-MM') = :month`, { month });
    }

    const rows: any[] = await qb.getRawMany();
    return rows.map((r) => ({
      employee_id: r.employee_id === null ? null : Number(r.employee_id),
      employee_name: r.employee_name || 'Not recorded',
      invoice_count: Number(r.invoice_count),
      total_collected_bdt: Number(r.total_collected_bdt),
    }));
  }

  async findOne(id: number): Promise<Invoice> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id },
      relations: { student: true, country: true },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found.`);
    }
    return invoice;
  }

  async getPdfPath(id: number): Promise<string> {
    const invoice = await this.findOne(id);
    if (!invoice.pdf_path || !fs.existsSync(invoice.pdf_path)) {
      throw new NotFoundException(`Invoice file for registration number ${invoice.invoice_id} not found on the local disk.`);
    }
    return invoice.pdf_path;
  }
}
