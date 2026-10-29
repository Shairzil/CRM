import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateCounselorDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z\s]+$/, { message: 'Name must contain only alphabets and spaces.' })
  name: string;
}
