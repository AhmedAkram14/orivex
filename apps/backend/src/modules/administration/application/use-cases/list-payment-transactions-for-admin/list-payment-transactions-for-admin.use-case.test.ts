import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import { Account } from '../../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../../identity/domain/enums/account-role.enum.js';
import { DisplayName } from '../../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../../identity/domain/value-objects/email-address.value-object.js';
import { GetAccountByIdUseCase } from '../../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import { ListPaymentTransactionsUseCase } from '../../../../payment/application/use-cases/list-payment-transactions/list-payment-transactions.use-case.js';
import { PaymentTransaction } from '../../../../payment/domain/entities/payment-transaction.entity.js';
import { PaymentMethod } from '../../../../payment/domain/enums/payment-method.enum.js';
import { Money } from '../../../../payment/domain/value-objects/money.value-object.js';

import { ListPaymentTransactionsForAdminQuery } from './list-payment-transactions-for-admin.query.js';
import { ListPaymentTransactionsForAdminUseCase } from './list-payment-transactions-for-admin.use-case.js';

class InMemoryAccountRepository {
  constructor(private readonly accounts: Account[]) {}
  async findById(id: { toString(): string }): Promise<Account | null> {
    return this.accounts.find((a) => a.getId().toString() === id.toString()) ?? null;
  }
}

class InMemoryPatientProfileRepository {
  constructor(private readonly profiles: PatientProfile[]) {}
  async findById(id: string): Promise<PatientProfile | null> {
    return this.profiles.find((p) => p.getId() === id) ?? null;
  }
}

class InMemoryDoctorProfileRepository {
  constructor(private readonly profiles: DoctorProfile[]) {}
  async findById(id: string): Promise<DoctorProfile | null> {
    return this.profiles.find((p) => p.getId() === id) ?? null;
  }
}

function buildTransaction(patientId: string, doctorId: string): PaymentTransaction {
  return PaymentTransaction.initiate({
    idempotencyKey: `idem-${patientId}-${doctorId}`,
    appointmentId: '99999999-9999-4999-8999-999999999999',
    patientId,
    doctorId,
    amount: Money.create(500, 'EGP'),
    paymentMethod: PaymentMethod.Card,
  });
}

describe('ListPaymentTransactionsForAdminUseCase', () => {
  it('resolves each transaction row to its patient/doctor display names', async () => {
    const patientAccount = Account.register({
      email: EmailAddress.create('patient@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Youssef Ibrahim'),
    });
    patientAccount.releaseDomainEvents();
    const doctorAccount = Account.register({
      email: EmailAddress.create('doctor@example.com'),
      role: AccountRole.Doctor,
      displayName: DisplayName.create('Dr. Amina Hassan'),
    });
    doctorAccount.releaseDomainEvents();

    const patientProfile = PatientProfile.create({ accountId: patientAccount.getId().toString() });
    patientProfile.releaseDomainEvents();
    const doctorProfile = DoctorProfile.register({
      accountId: doctorAccount.getId().toString(),
      licenseNumber: 'LIC-1',
      specialtyId: 'specialty-1',
    });
    doctorProfile.releaseDomainEvents();

    const transaction = buildTransaction(patientProfile.getId(), doctorProfile.getId());

    const listPaymentTransactionsUseCase = {
      execute: async () => ({ transactions: [transaction], total: 1 }),
    } as unknown as ListPaymentTransactionsUseCase;
    const getPatientProfileByIdUseCase = new GetPatientProfileByIdUseCase(
      new InMemoryPatientProfileRepository([patientProfile]) as never,
    );
    const getDoctorProfileByIdUseCase = new GetDoctorProfileByIdUseCase(
      new InMemoryDoctorProfileRepository([doctorProfile]) as never,
    );
    const getAccountByIdUseCase = new GetAccountByIdUseCase(
      new InMemoryAccountRepository([patientAccount, doctorAccount]) as never,
    );

    const useCase = new ListPaymentTransactionsForAdminUseCase(
      listPaymentTransactionsUseCase,
      getPatientProfileByIdUseCase,
      getDoctorProfileByIdUseCase,
      getAccountByIdUseCase,
    );

    const result = await useCase.execute(new ListPaymentTransactionsForAdminQuery({ page: 1, limit: 20 }));

    assert.equal(result.total, 1);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0]?.patientName, 'Youssef Ibrahim');
    assert.equal(result.rows[0]?.doctorName, 'Dr. Amina Hassan');
    assert.equal(result.rows[0]?.transaction, transaction);
  });

  it('falls back to "Unknown patient"/"Unknown doctor" when a profile no longer resolves', async () => {
    const transaction = buildTransaction('missing-patient-id', 'missing-doctor-id');
    const listPaymentTransactionsUseCase = {
      execute: async () => ({ transactions: [transaction], total: 1 }),
    } as unknown as ListPaymentTransactionsUseCase;
    const getPatientProfileByIdUseCase = new GetPatientProfileByIdUseCase(new InMemoryPatientProfileRepository([]) as never);
    const getDoctorProfileByIdUseCase = new GetDoctorProfileByIdUseCase(new InMemoryDoctorProfileRepository([]) as never);
    const getAccountByIdUseCase = new GetAccountByIdUseCase(new InMemoryAccountRepository([]) as never);

    const useCase = new ListPaymentTransactionsForAdminUseCase(
      listPaymentTransactionsUseCase,
      getPatientProfileByIdUseCase,
      getDoctorProfileByIdUseCase,
      getAccountByIdUseCase,
    );

    const result = await useCase.execute(new ListPaymentTransactionsForAdminQuery({ page: 1, limit: 20 }));

    assert.equal(result.rows[0]?.patientName, 'Unknown patient');
    assert.equal(result.rows[0]?.doctorName, 'Unknown doctor');
  });
});
