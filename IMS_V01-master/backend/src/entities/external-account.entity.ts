import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Student } from './student.entity';
import { User } from './user.entity';

/**
 * Link between an IMS student and their account in another nextED system
 * (configured with EXTERNAL_SYSTEMS in .env).
 */
@Entity('external_accounts')
@Index('UQ_external_accounts_student_system', ['student_id', 'system'], { unique: true })
export class ExternalAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  student_id: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  /** System key from EXTERNAL_SYSTEMS, e.g. "nexted_platform". */
  @Column({ type: 'varchar', length: 50 })
  system: string;

  @Column({ type: 'varchar' })
  external_id: string;

  @Column({ type: 'varchar', nullable: true })
  external_email: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'int', nullable: true })
  linked_by_user_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linked_by_user_id' })
  linked_by: User | null;

  @CreateDateColumn()
  created_at: Date;
}
