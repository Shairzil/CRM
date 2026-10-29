import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('sequences')
export class Sequence {
  @PrimaryColumn()
  key: string;

  @Column({ default: 1 })
  value: number;
}
