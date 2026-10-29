import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Salary } from '../entities/salary.entity';
import { IOEntry } from '../entities/io-entry.entity';
import { CreateSalaryDto } from './dto/create-salary.dto';

function getNextMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  const date = new Date(year, mon - 1, 1);
  date.setMonth(date.getMonth() + 1);
  const nextYear = date.getFullYear();
  const nextMon = String(date.getMonth() + 1).padStart(2, '0');
  return `${nextYear}-${nextMon}`;
}

@Injectable()
export class SalaryService {
  constructor(
    @InjectRepository(Salary)
    private salaryRepo: Repository<Salary>,
    @InjectRepository(IOEntry)
    private ioRepo: Repository<IOEntry>,
  ) {}

  async create(dto: CreateSalaryDto): Promise<Salary> {
    const salary = this.salaryRepo.create(dto);
    return this.salaryRepo.save(salary);
  }

  calculateChronologicalSalaries(
    employeeName: string,
    salaries: Salary[],
    ioEntries: IOEntry[],
  ): any[] {
    // Sort salaries by month, then id
    salaries.sort((a, b) => {
      if (a.month !== b.month) return a.month.localeCompare(b.month);
      return a.id - b.id;
    });

    if (salaries.length === 0 && ioEntries.length === 0) {
      return [];
    }

    const ioMap: Record<string, number> = {};
    for (const io of ioEntries) {
      ioMap[io.month] = (ioMap[io.month] || 0) + Number(io.amount);
    }

    const activeMonths = new Set<string>();
    for (const s of salaries) activeMonths.add(s.month);
    for (const io of ioEntries) activeMonths.add(io.month);

    const sortedMonths = Array.from(activeMonths).sort();
    const minMonth = sortedMonths[0];
    const maxMonth = sortedMonths[sortedMonths.length - 1];

    let currentMonth = minMonth;
    let currentDebt = 0;

    const salaryResultsMap = new Map<number, { ioDeduction: number; netSalary: number }>();

    while (currentMonth <= maxMonth) {
      const ioTaken = ioMap[currentMonth] || 0;
      const monthSalaries = salaries.filter((s) => s.month === currentMonth);

      for (const s of monthSalaries) {
        const ioDeduction = currentDebt;
        const netSalary = Number(s.baseSalary) - ioDeduction;
        salaryResultsMap.set(s.id, { ioDeduction, netSalary });

        currentDebt = Math.max(0, currentDebt - Number(s.baseSalary));
      }

      currentDebt += ioTaken;
      currentMonth = getNextMonth(currentMonth);
    }

    return salaries.map((s) => {
      const calc = salaryResultsMap.get(s.id) || { ioDeduction: 0, netSalary: Number(s.baseSalary) };
      return {
        id: s.id,
        employeeName: s.employeeName,
        month: s.month,
        baseSalary: Number(s.baseSalary),
        ioDeduction: calc.ioDeduction,
        netSalary: calc.netSalary,
        paid: s.paid,
      };
    });
  }

  async findAll(month?: string): Promise<any[]> {
    const salaries = await this.salaryRepo.find();
    const ioEntries = await this.ioRepo.find();

    const employees = new Set<string>([
      ...salaries.map((s) => s.employeeName),
      ...ioEntries.map((io) => io.employeeName),
    ]);

    const results: any[] = [];

    for (const empName of employees) {
      const empSalaries = salaries.filter((s) => s.employeeName === empName);
      const empIO = ioEntries.filter((io) => io.employeeName === empName);

      const calculated = this.calculateChronologicalSalaries(empName, empSalaries, empIO);
      results.push(...calculated);
    }

    let filteredResults = results;
    if (month) {
      filteredResults = results.filter((r) => r.month === month);
    }

    filteredResults.sort((a, b) => {
      if (a.employeeName !== b.employeeName) {
        return a.employeeName.localeCompare(b.employeeName);
      }
      return a.month.localeCompare(b.month);
    });

    return filteredResults;
  }

  async pay(id: number): Promise<any> {
    const salary = await this.salaryRepo.findOne({ where: { id } });
    if (!salary) {
      throw new NotFoundException(`Salary record with ID ${id} not found.`);
    }

    if (salary.paid) {
      throw new BadRequestException('Salary record is already paid.');
    }

    const allSalaries = await this.salaryRepo.find({
      where: { employeeName: salary.employeeName },
    });
    const allIOs = await this.ioRepo.find({
      where: { employeeName: salary.employeeName },
    });

    const calculatedRows = this.calculateChronologicalSalaries(salary.employeeName, allSalaries, allIOs);
    const targetRow = calculatedRows.find((r) => r.id === salary.id);

    if (!targetRow) {
      throw new BadRequestException('Failed to calculate net salary for this record.');
    }

    if (targetRow.netSalary <= 0) {
      if (targetRow.netSalary === 0) {
        throw new BadRequestException('Nothing to Pay');
      } else {
        throw new BadRequestException('Employee has to clear IO first');
      }
    }

    salary.paid = true;
    return this.salaryRepo.save(salary);
  }
}
