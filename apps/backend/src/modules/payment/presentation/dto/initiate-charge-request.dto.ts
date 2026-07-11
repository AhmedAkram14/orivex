import { Type } from 'class-transformer';
import { IsEnum, IsUUID, ValidateNested } from 'class-validator';

import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';

import { MoneyDto } from './money.dto.js';

// Matches docs/12-openapi.md's initiateCharge request body exactly.
export class InitiateChargeRequestDto {
  @IsUUID()
  consultationSessionId!: string;

  @ValidateNested()
  @Type(() => MoneyDto)
  amount!: MoneyDto;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}
