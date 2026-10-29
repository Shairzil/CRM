import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from './employee.entity';
import { Counselor } from './counselor.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ select: false })
  password: string;

  @Column({ type: 'varchar', nullable: true })
  full_name: string | null;

  /** admin | accounts | counselor | telecaller (see common/roles.ts) */
  @Column({ type: 'varchar', length: 20, default: 'counselor' })
  role: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  /** Bumped on password reset / deactivation so old tokens stop working. */
  @Column({ type: 'int', default: 0 })
  token_version: number;

  @Column({ type: 'int', nullable: true })
  employee_id: number | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee | null;

  @Column({ type: 'int', nullable: true })
  counselor_id: number | null;

  @ManyToOne(() => Counselor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'counselor_id' })
  counselor: Counselor | null;

  @Column({ type: 'timestamp', nullable: true })
  last_login_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
