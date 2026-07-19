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

  async findByIdempotencyKey(idempotencyKey: string): Promise<PaymentTransaction | null> {
    const row = await this.prisma.paymentTransaction.findUnique({ where: { idempotencyKey } });
    return row ? toDomainPaymentTransaction(row) : null;
  }

  async findByExternalReference(externalReference: string): Promise<PaymentTransaction | null> {
    const row = await this.prisma.paymentTransaction.findUnique({ where: { externalReference } });
    return row ? toDomainPaymentTransaction(row) : null;
  }

  // consultationSessionId is indexed but not unique at the schema level
  // (a session could, in principle, have more than one Failed attempt
  // before a Succeeded one) -- orderBy createdAt desc so the most recent
  // attempt (the one actually worth refunding) is the one returned.
  async findByConsultationSessionId(consultationSessionId: string): Promise<PaymentTransaction | null> {
    const row = await this.prisma.paymentTransaction.findFirst({
      where: { consultationSessionId },
      orderBy: { createdAt: 'desc' },
    });
    return row ? toDomainPaymentTransaction(row) : null;
  }

  async save(transaction: PaymentTransaction): Promise<void> {
    const data = {
      idempotencyKey: transaction.getIdempotencyKey(),
      consultationSessionId: transaction.getConsultationSessionId() ?? null,
      patientId: transaction.getPatientId(),
      doctorId: transaction.getDoctorId(),
      amount: transaction.getAmount().getAmount(),
      currency: transaction.getAmount().getCurrency(),
      paymentMethod: toPrismaPaymentMethod(transaction.getPaymentMethod()),
      status: toPrismaPaymentStatus(transaction.getStatus()),
      externalReference: transaction.getExternalReference() ?? null,
    };

    await this.prisma.paymentTransaction.upsert({
      where: { id: transaction.getId() },
      create: { id: transaction.getId(), ...data },
      update: data,
    });
  }
}
