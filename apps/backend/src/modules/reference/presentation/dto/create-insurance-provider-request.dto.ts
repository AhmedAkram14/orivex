import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateInsuranceProviderRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}
