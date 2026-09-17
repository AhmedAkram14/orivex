import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Dispute } from '../../../domain/entities/dispute.entity.js';
import type { DisputeRepository } from '../../../domain/repositories/dispute.repository.js';

import { ListDisputesForCallerUseCase } from './list-disputes-for-caller.use-case.js';

const APPOINTMENT_ID = '11111111-1111-4111-8111-111111111111';
const PATIENT_ACCOUNT_ID = 'patient-account';
const DOCTOR_ACCOUNT_ID = 'doctor-account';

// Dispute System Hardening Phase 1: `listForParty` is the repository's own
// access-control query -- this use case is a thin pass-through, so this test
// exercises the party-based visibility semantics at the level a fake
// repository can express: the repository returns whatever it's told to,
// standing in for "the caller is a genuine party to the underlying
// appointment", while a third party's account is never in that set.
class FakeDisputeRepository implements DisputeRepository {
  public lastAccountId?: string;
  constructor(private readonly disputesByParty: Map<string, Dispute[]>) {}
  async findById(): Promise<Dispute | null> {
    return null;
  }
  async findByAppointmentId(): Promise<Dispute | null> {
    return null;
  }
  async listForParty(accountId: string): Promise<Dispute[]> {
    this.lastAccountId = accountId;
    return this.disputesByParty.get(accountId) ?? [];
  }
  async listByStatus(): Promise<{ disputes: Dispute[]; total: number }> {
    return { disputes: [], total: 0 };
  }
  async save(): Promise<void> {}
  async update(): Promise<void> {}
}

describe('ListDisputesForCallerUseCase', () => {
  it('returns a doctor-raised dispute to the patient party too', async () => {
    const dispute = Dispute.raise({
      appointmentId: APPOINTMENT_ID,
      raisedByAccountId: DOCTOR_ACCOUNT_ID,
      reason: 'Patient was abusive.',
    });
    const repository = new FakeDisputeRepository(
      new Map([
        [PATIENT_ACCOUNT_ID, [dispute]],
        [DOCTOR_ACCOUNT_ID, [dispute]],
      ]),
    );
    const useCase = new ListDisputesForCallerUseCase(repository);

    const result = await useCase.execute({ callerAccountId: PATIENT_ACCOUNT_ID });

    assert.equal(result.length, 1);
    assert.equal(result[0]?.getId(), dispute.getId());
    assert.equal(result[0]?.getRaisedByAccountId(), DOCTOR_ACCOUNT_ID);
  });

  it('returns a patient-raised dispute to the doctor party too', async () => {
    const dispute = Dispute.raise({
      appointmentId: APPOINTMENT_ID,
      raisedByAccountId: PATIENT_ACCOUNT_ID,
      reason: 'Doctor no-show.',
    });
    const repository = new FakeDisputeRepository(
      new Map([
        [PATIENT_ACCOUNT_ID, [dispute]],
        [DOCTOR_ACCOUNT_ID, [dispute]],
      ]),
    );
    const useCase = new ListDisputesForCallerUseCase(repository);

    const result = await useCase.execute({ callerAccountId: DOCTOR_ACCOUNT_ID });

    assert.equal(result.length, 1);
    assert.equal(result[0]?.getId(), dispute.getId());
  });

  it('a genuine third party sees nothing', async () => {
    const dispute = Dispute.raise({
      appointmentId: APPOINTMENT_ID,
      raisedByAccountId: PATIENT_ACCOUNT_ID,
      reason: 'Doctor no-show.',
    });
    const repository = new FakeDisputeRepository(
      new Map([
        [PATIENT_ACCOUNT_ID, [dispute]],
        [DOCTOR_ACCOUNT_ID, [dispute]],
      ]),
    );
    const useCase = new ListDisputesForCallerUseCase(repository);

    const result = await useCase.execute({ callerAccountId: 'stranger-account' });

    assert.deepEqual(result, []);
  });

  it('delegates to listForParty with the caller account id', async () => {
    const repository = new FakeDisputeRepository(new Map());
    const useCase = new ListDisputesForCallerUseCase(repository);

    await useCase.execute({ callerAccountId: PATIENT_ACCOUNT_ID });

    assert.equal(repository.lastAccountId, PATIENT_ACCOUNT_ID);
  });
});
