import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateHospitalRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;
}
