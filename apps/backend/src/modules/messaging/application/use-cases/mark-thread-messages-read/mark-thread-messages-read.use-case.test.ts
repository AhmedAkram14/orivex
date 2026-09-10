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

import { MarkThreadMessagesReadCommand } from './mark-thread-messages-read.command.js';
import { MarkThreadMessagesReadUseCase } from './mark-thread-messages-read.use-case.js';

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
  public readonly savedAll: Message[][] = [];
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
  async saveAll(messages: Message[]): Promise<void> {
    this.savedAll.push(messages);
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
  messages: Message[];
  messageRepository: FakeMessageRepository;
  patientAccountId?: string;
  doctorAccountId?: string;
}): MarkThreadMessagesReadUseCase {
  const patientProfiles = new Map<string, PatientProfile>();
  if (props.patientAccountId) {
    patientProfiles.set(props.patientAccountId, { getId: () => PATIENT_ID } as PatientProfile);
  }
  const doctorProfiles = new Map<string, DoctorProfile>();
  if (props.doctorAccountId) {
    doctorProfiles.set(props.doctorAccountId, { getId: () => DOCTOR_ID } as DoctorProfile);
  }
  return new MarkThreadMessagesReadUseCase(
    props.messageRepository,
    new FakeMessageThreadRepository(props.thread),
    new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository(patientProfiles)),
    new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(doctorProfiles)),
  );
}

describe('MarkThreadMessagesReadUseCase', () => {
  it("marks only the other party's unread messages as read, never the caller's own", async () => {
    const thread = buildThread();
    const fromDoctor = Message.send({ threadId: thread.getId(), senderAccountId: 'doctor-account', body: 'How are you feeling?' });
    const fromPatient = Message.send({ threadId: thread.getId(), senderAccountId: 'patient-account', body: 'Better, thanks.' });
    const messageRepository = new FakeMessageRepository([fromDoctor, fromPatient]);
    const useCase = buildUseCase({ thread, messages: [fromDoctor, fromPatient], messageRepository, patientAccountId: 'patient-account' });

    await useCase.execute(new MarkThreadMessagesReadCommand({ threadId: thread.getId(), callerAccountId: 'patient-account' }));

    assert.equal(messageRepository.savedAll.length, 1);
    assert.equal(messageRepository.savedAll[0]?.length, 1);
    assert.equal(messageRepository.savedAll[0]?.[0]?.getId(), fromDoctor.getId());
    assert.ok(fromDoctor.getReadAt());
    assert.equal(fromPatient.getReadAt(), undefined);
  });

  it('is a no-op when there is nothing unread from the other party', async () => {
    const thread = buildThread();
    const messageRepository = new FakeMessageRepository([]);
    const useCase = buildUseCase({ thread, messages: [], messageRepository, patientAccountId: 'patient-account' });

    await useCase.execute(new MarkThreadMessagesReadCommand({ threadId: thread.getId(), callerAccountId: 'patient-account' }));

    assert.equal(messageRepository.savedAll.length, 0);
  });

  it('throws NotFoundError when the thread does not exist', async () => {
    const messageRepository = new FakeMessageRepository([]);
    const useCase = buildUseCase({ thread: null, messages: [], messageRepository, patientAccountId: 'patient-account' });

    await assert.rejects(
      () => useCase.execute(new MarkThreadMessagesReadCommand({ threadId: 'missing-id', callerAccountId: 'patient-account' })),
      NotFoundError,
    );
  });

  it('throws NotFoundError for a caller who is not a party to the thread', async () => {
    const thread = buildThread();
    const messageRepository = new FakeMessageRepository([]);
    const useCase = buildUseCase({ thread, messages: [], messageRepository });

    await assert.rejects(
      () => useCase.execute(new MarkThreadMessagesReadCommand({ threadId: thread.getId(), callerAccountId: 'stranger-account' })),
      NotFoundError,
    );
  });
});
