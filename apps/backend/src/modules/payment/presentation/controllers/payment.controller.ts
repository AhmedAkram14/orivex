import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { InitiateChargeCommand } from '../../application/use-cases/initiate-charge/initiate-charge.command.js';
import { InitiateChargeUseCase } from '../../application/use-cases/initiate-charge/initiate-charge.use-case.js';
import { InitiateChargeRequestDto } from '../dto/initiate-charge-request.dto.js';
import { PaymentTransactionResponseDto } from '../dto/payment-transaction-response.dto.js';
import { mapPaymentError } from '../mappers/payment-exception.mapper.js';

// Matches docs/12-openapi.md's POST /payments (initiateCharge) exactly.
// No GET /payments/{id} is documented, so none is built.
@Controller('payments')
export class PaymentController {
  constructor(private readonly initiateChargeUseCase: InitiateChargeUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async initiateCharge(
    @Body() body: InitiateChargeRequestDto,
  ): Promise<ResponseEnvelope<PaymentTransactionResponseDto>> {
    try {
      const transaction = await this.initiateChargeUseCase.execute(
        new InitiateChargeCommand({
          consultationSessionId: body.consultationSessionId,
          amount: body.amount.amount,
          currency: body.amount.currency,
          paymentMethod: body.paymentMethod,
        }),
      );
      return envelope(PaymentTransactionResponseDto.fromDomain(transaction));
    } catch (error) {
      throw mapPaymentError(error);
    }
  }
}
