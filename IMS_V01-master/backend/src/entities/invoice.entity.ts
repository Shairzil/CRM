import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Student } from './student.entity';
import { Country } from './country.entity';
import { Employee } from './employee.entity';
import { User } from './user.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  invoice_id: string;

  @Column({ nullable: true })
  student_id: number;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column()
  payer_name: string;

  @Column({ nullable: true })
  payer_phone_country_code: string;

  @Column({ nullable: true })
  payer_phone_number: string;

  @Column({ nullable: true })
  payment_method: string;

  @Column({ nullable: true })
  payment_detail: string;

  @Column({ nullable: true })
  bank_name: string;

  @Column({ nullable: true })
  country_id: number;

  @ManyToOne(() => Country)
  @JoinColumn({ name: 'country_id' })
  country: Country;

  @Column('decimal', { nullable: true, precision: 12, scale: 2, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  application_fee_bdt: number;

  @Column('decimal', { nullable: true, precision: 12, scale: 2, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  other_fee_bdt: number;

  @Column({ nullable: true })
  comment: string;

  @Column('decimal', { precision: 12, scale: 2, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  total_amount_bdt: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  paid_amount_bdt: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  due_amount_bdt: number;

  @Column({ nullable: true })
  pdf_path: string;

  @Column({ nullable: true })
  information: string;

  /** Employee who physically collected the money. */
  @Column({ type: 'int', nullable: true })
  collected_by_employee_id: number | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'collected_by_employee_id' })
  collected_by: Employee | null;

  /** Logged-in user who created the invoice. */
  @Column({ type: 'int', nullable: true })
  created_by_user_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  created_by: User | null;

  @CreateDateColumn()
  created_at: Date;
}
