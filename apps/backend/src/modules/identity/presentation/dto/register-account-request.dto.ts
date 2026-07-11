import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { MAX_DISPLAY_NAME_LENGTH } from '../../domain/constants/identity.constants.js';
import { AccountRole } from '../../domain/enums/account-role.enum.js';
import { Language } from '../../domain/enums/language.enum.js';

export class RegisterAccountRequestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  keycloakId!: string;

  @IsEnum(AccountRole)
  role!: AccountRole;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_DISPLAY_NAME_LENGTH)
  displayName!: string;

  @IsOptional()
  @IsEnum(Language)
  preferredLanguage?: Language;
}
