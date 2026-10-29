import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { LeadActivity } from './lead-activity.entity';

export const LEAD_STATUSES = ['new', 'contacted', 'interested', 'follow_up', 'not_interested', 'converted', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  full_name: string;

  @Column({ type: 'varchar', default: '+880' })
  phone_country_code: string;

  @Column({ type: 'varchar', nullable: true })
  phone_number: string | null;

  /** Last 10 digits of the phone, used for duplicate detection. */
  @Index('IDX_leads_phone_key')
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone_key: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  /** meta_ads | facebook | calling_team | reference | walk_in | website | ... */
  @Column({ type: 'varchar', length: 30, default: 'other' })
  source_channel: string;

  /** Free text: reference person's name, page name, etc. */
  @Column({ type: 'varchar', nullable: true })
  source_detail: string | null;

  // ── Meta Lead Ads tracking ────────────────────────────────────────────
  @Index('UQ_leads_meta_lead_id', { unique: true, where: 'meta_lead_id IS NOT NULL' })
  @Column({ type: 'varchar', nullable: true })
  meta_lead_id: string | null;

  @Column({ type: 'varchar', nullable: true })
  meta_form_id: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  platform: string | null;

  @Column({ type: 'varchar', nullable: true })
  campaign_id: string | null;

  @Column({ type: 'varchar', nullable: true })
  campaign_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  adset_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  ad_id: string | null;

  @Column({ type: 'varchar', nullable: true })
  ad_name: string | null;

  // ── Study interest ────────────────────────────────────────────────────
  @Column({ type: 'varchar', nullable: true })
  preferred_country: string | null;

  @Column({ type: 'varchar', nullable: true })
  preferred_course_level: string | null;

  @Column({ type: 'varchar', nullable: true })
  preferred_intake: string | null;

  // ── Pipeline ──────────────────────────────────────────────────────────
  @Index('IDX_leads_status')
  @Column({ type: 'varchar', length: 20, default: 'new' })
  status: string;

  @Column({ type: 'int', nullable: true })
  assigned_to_user_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assigned_to: User | null;

  @Column({ type: 'date', nullable: true })
  next_follow_up_date: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Set when the lead is turned into a collected-info record / registered student. */
  @Column({ type: 'int', nullable: true })
  student_info_id: number | null;

  @Column({ type: 'int', nullable: true })
  student_id: number | null;

  @Column({ type: 'jsonb', nullable: true })
  raw_payload: Record<string, any> | null;

  @Column({ type: 'int', nullable: true })
  created_by_user_id: number | null;

  @OneToMany(() => LeadActivity, (a) => a.lead)
  activities: LeadActivity[];

  /** When the lead was created at the source (e.g. Meta created_time). */
  @Column({ type: 'timestamp', nullable: true })
  source_created_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
