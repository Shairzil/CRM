import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Student } from './student.entity';
import { User } from './user.entity';

export const DOCUMENT_TYPES = [
  'passport',
  'photo',
  'ssc_certificate',
  'hsc_certificate',
  'bachelor_certificate',
  'master_certificate',
  'transcript',
  'english_test',
  'cv',
  'sop',
  'lor',
  'bank_statement',
  'sponsor_documents',
  'offer_letter',
  'visa_documents',
  'other',
] as const;

export const DOCUMENT_STATUSES = ['requested', 'uploaded', 'approved', 'rejected'] as const;

@Entity('student_documents')
export class StudentDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('IDX_student_documents_student')
  @Column({ type: 'int' })
  student_id: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ type: 'varchar', length: 40 })
  document_type: string;

  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  /** requested | uploaded | approved | rejected */
  @Column({ type: 'varchar', length: 20, default: 'requested' })
  status: string;

  @Column({ type: 'text', nullable: true })
  request_note: string | null;

  @Column({ type: 'date', nullable: true })
  due_date: string | null;

  @Column({ type: 'int', nullable: true })
  requested_by_user_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requested_by_user_id' })
  requested_by: User | null;

  // ── File (kept in file storage, never in the database) ────────────────
  @Column({ type: 'varchar', nullable: true })
  file_key: string | null;

  @Column({ type: 'varchar', nullable: true })
  file_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  file_mime: string | null;

  @Column({ type: 'int', nullable: true })
  file_size: number | null;

  @Column({ type: 'int', nullable: true })
  uploaded_by_user_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploaded_by: User | null;

  @Column({ type: 'timestamp', nullable: true })
  uploaded_at: Date | null;

  // ── Review ────────────────────────────────────────────────────────────
  @Column({ type: 'int', nullable: true })
  reviewed_by_user_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by_user_id' })
  reviewed_by: User | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  review_note: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
