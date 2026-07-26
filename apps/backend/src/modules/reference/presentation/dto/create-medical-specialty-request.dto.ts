import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMedicalSpecialtyRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}
