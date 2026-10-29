import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('countries')
export class Country {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  currency_code: string;

  @Column()
  currency_symbol: string;

  @Column('decimal', { precision: 10, scale: 2, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  application_fee: number;
}
