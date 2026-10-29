import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('salaries')
export class Salary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employeeName: string;

  // Stored as 'YYYY-MM' string, e.g. '2026-06'
  @Column()
  month: string;

  @Column('decimal', { precision: 12, scale: 2 })
  baseSalary: number;

  @Column({ default: false })
  paid: boolean;

  @CreateDateColumn()
  created_at: Date;
}
