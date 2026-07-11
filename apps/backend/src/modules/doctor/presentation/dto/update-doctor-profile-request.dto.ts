import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

class PortfolioPublicationDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

class PortfolioAwardDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  issuingBody?: string;
}

export class UpdateDoctorProfileRequestDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  specialty?: string;

  @IsOptional()
  @IsString()
  biography?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  consultationFeeAmount?: number;

  @IsOptional()
  @IsArray()
  publications?: PortfolioPublicationDto[];

  @IsOptional()
  @IsArray()
  awards?: PortfolioAwardDto[];
}
