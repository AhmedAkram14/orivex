import { IsNotEmpty, IsString } from 'class-validator';

export class ResetPasswordRequestDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
