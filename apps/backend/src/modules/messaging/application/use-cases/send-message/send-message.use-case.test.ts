import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
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

import { SendMessageCommand } from './send-message.command.js';
import { SendMessageUseCase } from './send-message.use-case.js';

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
  public readonly saved: Message[] = [];
  async findById(): Promise<Message | null> {
    return null;
  }
  async findByThreadId(): Promise<Message[]> {
    return [];
  }
  async countUnreadForRecipient(): Promise<number> {
    return 0;
  }
  async save(message: Message): Promise<void> {
    this.saved.push(message);
  }
  async saveAll(messages: Message[]): Promise<void> {
    this.saved.push(...messages);
  }
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
  messageRepository: FakeMessageRepository;
  patientAccountId?: string;
  doctorAccountId?: string;
}): SendMessageUseCase {
  const patientProfiles = new Map<string, PatientProfile>();
  if (props.patientAccountId) {
    patientProfiles.set(props.patientAccountId, { getId: () => PATIENT_ID } as PatientProfile);
  }
  const doctorProfiles = new Map<string, DoctorProfile>();
  if (props.doctorAccountId) {
    doctorProfiles.set(props.doctorAccountId, { getId: () => DOCTOR_ID } as DoctorProfile);
  }
  return new SendMessageUseCase(
    props.messageRepository,
    new FakeMessageThreadRepository(props.thread),
    new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository(patientProfiles)),
    new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(doctorProfiles)),
  );
}

describe('SendMessageUseCase', () => {
  it('lets the patient party send a message', async () => {
    const thread = buildThread();
    const messageRepository = new FakeMessageRepository();
    const useCase = buildUseCase({ thread, messageRepository, patientAccountId: 'patient-account' });

    const message = await useCase.execute(
      new SendMessageCommand({ threadId: thread.getId(), senderAccountId: 'patient-account', body: 'When should I take the medicine?' }),
    );

    assert.equal(message.getBody(), 'When should I take the medicine?');
    assert.equal(messageRepository.saved.length, 1);
  });

  it('lets the doctor party send a message', async () => {
    const thread = buildThread();
    const messageRepository = new FakeMessageRepository();
    const useCase = buildUseCase({ thread, messageRepository, doctorAccountId: 'doctor-account' });

    const message = await useCase.execute(
      new SendMessageCommand({ threadId: thread.getId(), senderAccountId: 'doctor-account', body: 'Twice daily after meals.' }),
    );

    assert.equal(message.getSenderAccountId(), 'doctor-account');
  });

  it('throws NotFoundError when the thread does not exist', async () => {
    const messageRepository = new FakeMessageRepository();
    const useCase = buildUseCase({ thread: null, messageRepository, patientAccountId: 'patient-account' });

    await assert.rejects(
      () => useCase.execute(new SendMessageCommand({ threadId: 'missing-id', senderAccountId: 'patient-account', body: 'hello' })),
      NotFoundError,
    );
  });

  it('throws ForbiddenError when the sender is not a party to the thread', async () => {
    const thread = buildThread();
    const messageRepository = new FakeMessageRepository();
    const useCase = buildUseCase({ thread, messageRepository });

    await assert.rejects(
      () => useCase.execute(new SendMessageCommand({ threadId: thread.getId(), senderAccountId: 'stranger-account', body: 'hello' })),
      ForbiddenError,
    );
  });
});
