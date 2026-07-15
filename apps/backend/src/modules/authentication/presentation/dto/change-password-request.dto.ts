import { IsNotEmpty, IsString } from 'class-validator';

export class ChangePasswordRequestDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  newPassword!: string;
}
