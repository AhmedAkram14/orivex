import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';

import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';

import { MoneyDto } from './money.dto.js';

// Matches docs/12-openapi.md's initiateCharge request body, plus
// idempotencyKey -- a client-generated, per-attempt-unique token (e.g. a
// UUID minted once per "user clicks Pay" action, reused verbatim on any
// automatic retry of that same click) that makes this endpoint safely
// retryable without risking a double charge.
export class InitiateChargeRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  idempotencyKey!: string;

  @IsUUID()
  consultationSessionId!: string;

  @ValidateNested()
  @Type(() => MoneyDto)
  amount!: MoneyDto;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}
