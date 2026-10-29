import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, OneToMany } from 'typeorm';
import { Student } from './student.entity';
import { Country } from './country.entity';
import { User } from './user.entity';
import { ApplicationStatusHistory } from './application-status-history.entity';
import { decimalTransformer } from '../common/decimal.transformer';

/** Ordered pipeline. Terminal states: rejected, visa_refused, withdrawn, enrolled. */
export const APPLICATION_STATUSES = [
  'draft',
  'documents_pending',
  'submitted',
  'conditional_offer',
  'unconditional_offer',
  'rejected',
  'deposit_paid',
  'cas_coe_received',
  'visa_applied',
  'visa_granted',
  'visa_refused',
  'enrolled',
  'withdrawn',
] as const;

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('IDX_applications_student')
  @Column({ type: 'int' })
  student_id: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ type: 'int', nullable: true })
  country_id: number | null;

  @ManyToOne(() => Country, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'country_id' })
  country: Country | null;

  @Column()
  university_name: string;

  @Column()
  course_name: string;

  /** Foundation / Diploma / Bachelor / Master / MRes / PhD */
  @Column({ type: 'varchar', nullable: true })
  course_level: string | null;

  /** e.g. "September 2027" */
  @Column({ type: 'varchar', nullable: true })
  intake: string | null;

  @Index('IDX_applications_status')
  @Column({ type: 'varchar', length: 30, default: 'draft' })
  status: string;

  @Column('decimal', { precision: 12, scale: 2, nullable: true, transformer: decimalTransformer })
  application_fee: number | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  application_fee_currency: string | null;

  @Column('decimal', { precision: 12, scale: 2, nullable: true, transformer: decimalTransformer })
  tuition_fee: number | null;

  @Column({ type: 'varchar', nullable: true })
  university_reference: string | null;

  @Column({ type: 'date', nullable: true })
  submitted_at: string | null;

  @Column({ type: 'date', nullable: true })
  decision_at: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'int', nullable: true })
  assigned_to_user_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assigned_to: User | null;

  @Column({ type: 'int', nullable: true })
  created_by_user_id: number | null;

  @OneToMany(() => ApplicationStatusHistory, (h) => h.application)
  history: ApplicationStatusHistory[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
