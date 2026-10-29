import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Country } from './country.entity';
import { StudentFollowUp } from './student-follow-up.entity';
import { Counselor } from './counselor.entity';
import { Employee } from './employee.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  student_id: string;

  @Column()
  name: string;

  @Column()
  phone_country_code: string;

  @Column()
  phone_number: string;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column()
  counselor_name: string;

  /** ID link to counselors table (counselor_name is kept for the existing screens). */
  @Column({ type: 'int', nullable: true })
  counselor_id: number | null;

  @ManyToOne(() => Counselor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'counselor_id' })
  counselor: Counselor | null;

  @Column({ nullable: true })
  study_level: string;

  @Column()
  source_type: string;

  @Column()
  source_name: string;

  /** Employee who brought the student, when source_type = 'employee'. */
  @Column({ type: 'int', nullable: true })
  source_employee_id: number | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_employee_id' })
  source_employee: Employee | null;

  /** Normalised channel: meta_ads, facebook, calling_team, reference, ... */
  @Column({ type: 'varchar', length: 30, nullable: true })
  source_channel: string | null;

  @Column({ type: 'varchar', nullable: true })
  campaign_name: string | null;

  /** Lead this student came from, if any. */
  @Column({ type: 'int', nullable: true })
  lead_id: number | null;

  @Column({ type: 'date' })
  date_of_opening: Date;

  @Column('decimal', { precision: 12, scale: 2, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  file_opening_fee_bdt: number;

  @Column({ nullable: true })
  country_id: number;

  @ManyToOne(() => Country)
  @JoinColumn({ name: 'country_id' })
  country: Country;

  @Column('decimal', { nullable: true, precision: 10, scale: 2, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  application_fee_foreign: number;

  @Column('decimal', { nullable: true, precision: 12, scale: 2, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  application_fee_bdt: number;

  @Column('decimal', { nullable: true, precision: 10, scale: 4, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  exchange_rate_used: number;

  @Column({ type: 'date', nullable: true })
  follow_up_date: Date | null;

  @Column({ type: 'varchar', nullable: true })
  follow_up_note: string | null;

  @Column({ type: 'varchar', default: 'Registered' })
  status: string;

  @OneToMany(() => StudentFollowUp, (followUp) => followUp.student, { cascade: true })
  follow_ups: StudentFollowUp[];

  @Column({ nullable: true })
  cv_name: string;

  @Column({ nullable: true })
  cv_mime: string;

  @Column({ type: 'bytea', nullable: true, select: false })
  cv_data: Buffer;

  @CreateDateColumn()
  created_at: Date;
}
