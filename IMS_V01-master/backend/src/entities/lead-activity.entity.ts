import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Lead } from './lead.entity';
import { User } from './user.entity';

/** Call log / notes / status changes on a lead. */
@Entity('lead_activities')
export class LeadActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  lead_id: number;

  @ManyToOne(() => Lead, (lead) => lead.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ type: 'int', nullable: true })
  user_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  /** note | call | status_change | assignment | conversion | system */
  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  created_at: Date;
}
