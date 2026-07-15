import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginRequestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  // Accepted for frontend contract compatibility; not yet used to vary
  // refresh-token lifetime -- a documented scope trim, not silently dropped.
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
