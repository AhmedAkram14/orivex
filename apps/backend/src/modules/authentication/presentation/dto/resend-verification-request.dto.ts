import { IsEmail } from 'class-validator';

export class ResendVerificationRequestDto {
  @IsEmail()
  email!: string;
}
