import type { GetAccountByIdUseCase } from '../../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { ListPaymentTransactionsUseCase } from '../../../../payment/application/use-cases/list-payment-transactions/list-payment-transactions.use-case.js';
import { ListPaymentTransactionsQuery } from '../../../../payment/application/use-cases/list-payment-transactions/list-payment-transactions.query.js';
import type { PaymentTransaction } from '../../../../payment/domain/entities/payment-transaction.entity.js';

import type { ListPaymentTransactionsForAdminQuery } from './list-payment-transactions-for-admin.query.js';

export interface AdminPaymentTransactionRow {
  transaction: PaymentTransaction;
  patientName: string;
  doctorName: string;
}

export interface ListPaymentTransactionsForAdminResult {
  rows: AdminPaymentTransactionRow[];
  total: number;
}

// Plain TypeScript class -- no NestJS dependency; DI wiring lives in
// administration.module.ts only.
//
// ORIVEX Roadmap Phase 3, Critical Lifecycle Gaps, Step 4: composes
// PaymentModule's exported ListPaymentTransactionsUseCase with
// Patient/Doctor/IdentityModule's exported profile/account reads to resolve
// a display name for each side of the transaction -- the same
// orchestrate-only-through-exported-use-cases shape
// GetVerificationReviewQueueUseCase already established for TrustModule.
// AdministrationModule never touches another module's repository directly.
export class ListPaymentTransactionsForAdminUseCase {
  constructor(
    private readonly listPaymentTransactionsUseCase: ListPaymentTransactionsUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
  ) {}

  async execute(query: ListPaymentTransactionsForAdminQuery): Promise<ListPaymentTransactionsForAdminResult> {
    const { transactions, total } = await this.listPaymentTransactionsUseCase.execute(
      new ListPaymentTransactionsQuery({ page: query.page, limit: query.limit }),
    );

    const rows = await Promise.all(
      transactions.map(async (transaction) => {
        const [patientName, doctorName] = await Promise.all([
          this.resolvePatientName(transaction.getPatientId()),
          this.resolveDoctorName(transaction.getDoctorId()),
        ]);
        return { transaction, patientName, doctorName };
      }),
    );

    return { rows, total };
  }

  private async resolvePatientName(patientProfileId: string): Promise<string> {
    const profile = await this.getPatientProfileByIdUseCase.execute({ patientProfileId });
    if (!profile) {
      return 'Unknown patient';
    }
    const account = await this.getAccountByIdUseCase.execute({ accountId: profile.getAccountId() });
    return account ? account.getUserProfile().getDisplayName().toString() : 'Unknown patient';
  }

  private async resolveDoctorName(doctorProfileId: string): Promise<string> {
    const profile = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId });
    if (!profile) {
      return 'Unknown doctor';
    }
    const account = await this.getAccountByIdUseCase.execute({ accountId: profile.getAccountId() });
    return account ? account.getUserProfile().getDisplayName().toString() : 'Unknown doctor';
  }
}
