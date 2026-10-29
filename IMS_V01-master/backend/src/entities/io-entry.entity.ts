import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('io_entries')
export class IOEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employeeName: string;

  // Month the IO was taken, stored as 'YYYY-MM' string, e.g. '2026-05'
  @Column()
  month: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @CreateDateColumn()
  created_at: Date;
}
