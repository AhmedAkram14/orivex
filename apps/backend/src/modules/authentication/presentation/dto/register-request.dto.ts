import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RegisterRequestDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsEmail()
  email!: string;

  // Strength (length/complexity) is validated in the domain layer
  // (PlainPassword.create), not here -- this DTO only guards the HTTP
  // boundary against a missing/non-string field.
  @IsString()
  @IsNotEmpty()
  password!: string;
}
