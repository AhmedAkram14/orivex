import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDepartmentRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}
