import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Student } from './student.entity';

@Entity('student_follow_ups')
export class StudentFollowUp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  student_id: number;

  @ManyToOne(() => Student, (student) => student.follow_ups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ type: 'date' })
  follow_up_date: Date;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;
}
