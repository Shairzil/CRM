import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Application } from './application.entity';
import { User } from './user.entity';

@Entity('application_status_history')
export class ApplicationStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  application_id: number;

  @ManyToOne(() => Application, (a) => a.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ type: 'varchar', length: 30, nullable: true })
  from_status: string | null;

  @Column({ type: 'varchar', length: 30 })
  to_status: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'int', nullable: true })
  changed_by_user_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changed_by_user_id' })
  changed_by: User | null;

  @CreateDateColumn()
  created_at: Date;
}
