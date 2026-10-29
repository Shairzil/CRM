import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('student_info')
export class StudentInfo {
  @PrimaryGeneratedColumn()
  id: number;

  // Personal Information
  @Column()
  name: string;

  @Column()
  phone_country_code: string;

  @Column()
  phone_number: string;

  // Study Preferences
  @Column({ nullable: true })
  preferred_country: string;

  @Column({ nullable: true })
  preferred_course: string;

  @Column({ nullable: true })
  preferred_course_level: string; // Foundation / Diploma / Bachelor / Master / MRes / PhD

  @Column({ nullable: true })
  preferred_intake: string;

  // Academic Background - SSC / O-Level
  @Column({ nullable: true })
  ssc_gpa: string;

  @Column({ nullable: true })
  ssc_year: string;

  // HSC / A-Level
  @Column({ nullable: true })
  hsc_gpa: string;

  @Column({ nullable: true })
  hsc_year: string;

  // Bachelor
  @Column({ nullable: true })
  bachelor_subject: string;

  @Column({ nullable: true })
  bachelor_university: string;

  @Column({ nullable: true })
  bachelor_cgpa: string;

  @Column({ nullable: true })
  bachelor_year: string;

  // Master
  @Column({ nullable: true })
  master_subject: string;

  @Column({ nullable: true })
  master_university: string;

  @Column({ nullable: true })
  master_cgpa: string;

  @Column({ nullable: true })
  master_year: string;

  // English Language Proficiency
  @Column({ nullable: true })
  test_taken: string; // Stored as comma-separated string e.g., 'IELTS,PTE' or 'None'

  @Column({ nullable: true })
  overall_score: string; // Overall Score & Test Date

  // Additional Information
  @Column({ nullable: true })
  study_gap: string;

  @Column({ nullable: true })
  work_experience: string;

  @Column({ nullable: true })
  visa_refusal: string;

  @Column({ nullable: true })
  estimated_budget: string;

  // Counsellor Notes
  @Column({ type: 'text', nullable: true })
  counsellor_notes: string;

  @Column({ nullable: true })
  counselor_name: string;

  @Column({ nullable: true })
  source_type: string;

  @Column({ nullable: true })
  source_name: string;

  @Column({ nullable: true })
  cv_name: string;

  @Column({ nullable: true })
  cv_mime: string;

  @Column({ type: 'bytea', nullable: true, select: false })
  cv_data: Buffer;

  @CreateDateColumn()
  created_at: Date;
}
