import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { PaymentTransaction } from '../../domain/entities/payment-transaction.entity.js';
import type { PaymentTransactionRepository } from '../../domain/repositories/payment-transaction.repository.js';

import { toPrismaPaymentMethod } from './payment-method.mapper.js';
import { toDomainPaymentTransaction } from './payment-transaction.mapper.js';
import { toPrismaPaymentStatus } from './payment-status.mapper.js';

@Injectable()
export class PrismaPaymentTransactionRepository implements PaymentTransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PaymentTransaction | null> {
    const row = await this.prisma.paymentTransaction.findUnique({ where: { id } });
    return row ? toDomainPaymentTransaction(row) : null;
  }

  async save(transaction: PaymentTransaction): Promise<void> {
    const data = {
      consultationSessionId: transaction.getConsultationSessionId() ?? null,
      patientId: transaction.getPatientId(),
      doctorId: transaction.getDoctorId(),
      amount: transaction.getAmount().getAmount(),
      currency: transaction.getAmount().getCurrency(),
      paymentMethod: toPrismaPaymentMethod(transaction.getPaymentMethod()),
      status: toPrismaPaymentStatus(transaction.getStatus()),
    };

    await this.prisma.paymentTransaction.upsert({
      where: { id: transaction.getId() },
      create: { id: transaction.getId(), ...data },
      update: data,
    });
  }
}
