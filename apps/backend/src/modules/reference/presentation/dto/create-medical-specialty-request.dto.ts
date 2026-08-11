import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMedicalSpecialtyRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nameAr?: string;
}
