import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import type { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import { Message } from '../../../domain/entities/message.entity.js';
import { MessageThread } from '../../../domain/entities/message-thread.entity.js';
import type { MessageRepository } from '../../../domain/repositories/message.repository.js';
import type { MessageThreadRepository } from '../../../domain/repositories/message-thread.repository.js';

import { ListMessagesForThreadUseCase } from './list-messages-for-thread.use-case.js';

const PATIENT_ID = '11111111-1111-4111-8111-111111111111';
const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';

class FakeMessageThreadRepository implements MessageThreadRepository {
  constructor(private readonly thread: MessageThread | null) {}
  async findById(id: string): Promise<MessageThread | null> {
    return this.thread?.getId() === id ? this.thread : null;
  }
  async findByAppointmentId(): Promise<MessageThread | null> {
    return null;
  }
  async findByPatientId(): Promise<MessageThread[]> {
    return [];
  }
  async findByDoctorId(): Promise<MessageThread[]> {
    return [];
  }
  async save(): Promise<void> {}
}

class FakeMessageRepository implements MessageRepository {
  constructor(private readonly messages: Message[]) {}
  async findById(): Promise<Message | null> {
    return null;
  }
  async findByThreadId(): Promise<Message[]> {
    return this.messages;
  }
  async countUnreadForRecipient(): Promise<number> {
    return 0;
  }
  async save(): Promise<void> {}
  async saveAll(): Promise<void> {}
}

class FakePatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profileByAccountId: Map<string, PatientProfile>) {}
  async findById(): Promise<PatientProfile | null> {
    return null;
  }
  async findByAccountId(accountId: string): Promise<PatientProfile | null> {
    return this.profileByAccountId.get(accountId) ?? null;
  }
  async save(): Promise<void> {}
}

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profileByAccountId: Map<string, DoctorProfile>) {}
  async findById(): Promise<DoctorProfile | null> {
    return null;
  }
  async findByAccountId(accountId: string): Promise<DoctorProfile | null> {
    return this.profileByAccountId.get(accountId) ?? null;
  }
  async save(): Promise<void> {}
}

function buildThread(): MessageThread {
  return MessageThread.start({
    appointmentId: '33333333-3333-4333-8333-333333333333',
    patientId: PATIENT_ID,
    doctorId: DOCTOR_ID,
  });
}

function buildUseCase(props: {
  thread: MessageThread | null;
  messages: Message[];
  patientAccountId?: string;
  doctorAccountId?: string;
}): ListMessagesForThreadUseCase {
  const patientProfiles = new Map<string, PatientProfile>();
  if (props.patientAccountId) {
    patientProfiles.set(props.patientAccountId, { getId: () => PATIENT_ID } as PatientProfile);
  }
  const doctorProfiles = new Map<string, DoctorProfile>();
  if (props.doctorAccountId) {
    doctorProfiles.set(props.doctorAccountId, { getId: () => DOCTOR_ID } as DoctorProfile);
  }
  return new ListMessagesForThreadUseCase(
    new FakeMessageRepository(props.messages),
    new FakeMessageThreadRepository(props.thread),
    new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository(patientProfiles)),
    new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(doctorProfiles)),
  );
}

describe('ListMessagesForThreadUseCase', () => {
  it('returns the thread messages for a party to it', async () => {
    const thread = buildThread();
    const message = Message.send({ threadId: thread.getId(), senderAccountId: 'doctor-account', body: 'hello' });
    const useCase = buildUseCase({ thread, messages: [message], doctorAccountId: 'doctor-account' });

    const messages = await useCase.execute({ threadId: thread.getId(), callerAccountId: 'doctor-account' });

    assert.equal(messages.length, 1);
    assert.equal(messages[0]?.getBody(), 'hello');
  });

  it('throws NotFoundError when the thread does not exist', async () => {
    const useCase = buildUseCase({ thread: null, messages: [], patientAccountId: 'patient-account' });

    await assert.rejects(
      () => useCase.execute({ threadId: 'missing-id', callerAccountId: 'patient-account' }),
      NotFoundError,
    );
  });

  it('throws NotFoundError (never a distinguishing 403) for a caller who is not a party', async () => {
    const thread = buildThread();
    const useCase = buildUseCase({ thread, messages: [] });

    await assert.rejects(
      () => useCase.execute({ threadId: thread.getId(), callerAccountId: 'stranger-account' }),
      NotFoundError,
    );
  });
});
