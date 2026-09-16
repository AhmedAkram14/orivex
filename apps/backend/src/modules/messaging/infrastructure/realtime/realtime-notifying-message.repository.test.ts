import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import { Message } from '../../domain/entities/message.entity.js';
import { MessageThread } from '../../domain/entities/message-thread.entity.js';
import type { MessageRepository } from '../../domain/repositories/message.repository.js';
import type { MessageThreadRepository } from '../../domain/repositories/message-thread.repository.js';

import { RealtimeNotifyingMessageRepository } from './realtime-notifying-message.repository.js';

const PATIENT_ID = '11111111-1111-4111-8111-111111111111';
const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';
const PATIENT_ACCOUNT_ID = '33333333-3333-4333-8333-333333333333';
const DOCTOR_ACCOUNT_ID = '44444444-4444-4444-8444-444444444444';

class FakeInnerMessageRepository implements MessageRepository {
  public saved: Message[] = [];
  public savedAllAndMarkThreadRead: { messages: Message[]; thread: MessageThread }[] = [];
  async findById(): Promise<Message | null> {
    return null;
  }
  async findByThreadId(): Promise<Message[]> {
    return [];
  }
  async countUnreadForRecipient(): Promise<number> {
    return 0;
  }
  async countUnreadForAccount(): Promise<number> {
    return 0;
  }
  async save(message: Message): Promise<void> {
    this.saved.push(message);
  }
  async saveAll(messages: Message[]): Promise<void> {
    this.saved.push(...messages);
  }
  async saveAllAndMarkThreadRead(messages: Message[], thread: MessageThread): Promise<void> {
    this.savedAllAndMarkThreadRead.push({ messages, thread });
  }
}

class FakeMessageThreadRepository implements MessageThreadRepository {
  constructor(private readonly thread: MessageThread | null) {}
  async findById(id: string): Promise<MessageThread | null> {
    return this.thread?.getId() === id ? this.thread : null;
  }
  async findByPatientAndDoctor(): Promise<MessageThread | null> {
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

class FakePatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profile: PatientProfile | null) {}
  async findById(): Promise<PatientProfile | null> {
    return this.profile;
  }
  async findByAccountId(): Promise<PatientProfile | null> {
    return this.profile;
  }
  async save(): Promise<void> {}
}

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profile: DoctorProfile | null) {}
  async findById(): Promise<DoctorProfile | null> {
    return this.profile;
  }
  async findByAccountId(): Promise<DoctorProfile | null> {
    return this.profile;
  }
  async save(): Promise<void> {}
}

class FakeRealtimeEmitter {
  public emitted: { accountId: string; event: string; payload: unknown }[] = [];
  emitToAccount(accountId: string, event: string, payload: unknown): void {
    this.emitted.push({ accountId, event, payload });
  }
}

function buildThread(): MessageThread {
  return MessageThread.start({ patientId: PATIENT_ID, doctorId: DOCTOR_ID });
}

function buildDecorator(props: { thread: MessageThread | null; inner?: FakeInnerMessageRepository }) {
  const inner = props.inner ?? new FakeInnerMessageRepository();
  const emitter = new FakeRealtimeEmitter();
  const threadRepository = new FakeMessageThreadRepository(props.thread);
  const getPatientProfileByIdUseCase = new GetPatientProfileByIdUseCase(
    new FakePatientProfileRepository({ getId: () => PATIENT_ID, getAccountId: () => PATIENT_ACCOUNT_ID } as PatientProfile),
  );
  const getDoctorProfileByIdUseCase = new GetDoctorProfileByIdUseCase(
    new FakeDoctorProfileRepository({ getId: () => DOCTOR_ID, getAccountId: () => DOCTOR_ACCOUNT_ID } as DoctorProfile),
  );
  const decorator = new RealtimeNotifyingMessageRepository(
    inner,
    emitter,
    threadRepository,
    getPatientProfileByIdUseCase,
    getDoctorProfileByIdUseCase,
  );
  return { decorator, inner, emitter };
}

describe('RealtimeNotifyingMessageRepository', () => {
  it('saves through to the inner repository and emits message.sent to the RECIPIENT (not the sender)', async () => {
    const thread = buildThread();
    const { decorator, inner, emitter } = buildDecorator({ thread });
    const message = Message.send({ threadId: thread.getId(), senderAccountId: PATIENT_ACCOUNT_ID, body: 'hello' });

    await decorator.save(message);

    assert.equal(inner.saved.length, 1);
    assert.equal(inner.saved[0], message);
    assert.equal(emitter.emitted.length, 1);
    assert.equal(emitter.emitted[0]!.accountId, DOCTOR_ACCOUNT_ID);
    assert.equal(emitter.emitted[0]!.event, 'message.sent');
    assert.deepEqual(emitter.emitted[0]!.payload, { threadId: thread.getId(), messageId: message.getId() });
  });

  it('emits to the patient when the doctor is the sender', async () => {
    const thread = buildThread();
    const { decorator, emitter } = buildDecorator({ thread });
    const message = Message.send({ threadId: thread.getId(), senderAccountId: DOCTOR_ACCOUNT_ID, body: 'reply' });

    await decorator.save(message);

    assert.equal(emitter.emitted.length, 1);
    assert.equal(emitter.emitted[0]!.accountId, PATIENT_ACCOUNT_ID);
  });

  it('never emits when the thread cannot be resolved', async () => {
    const { decorator, emitter } = buildDecorator({ thread: null });
    const message = Message.send({ threadId: 'missing-thread', senderAccountId: PATIENT_ACCOUNT_ID, body: 'hello' });

    await decorator.save(message);

    assert.equal(emitter.emitted.length, 0);
  });

  it('saves through to the inner repository and emits message.read to the SENDER of the now-read messages, after saveAllAndMarkThreadRead', async () => {
    const thread = buildThread();
    const { decorator, inner, emitter } = buildDecorator({ thread });
    const messageFromDoctor = Message.send({ threadId: thread.getId(), senderAccountId: DOCTOR_ACCOUNT_ID, body: 'from doctor' });
    messageFromDoctor.markRead();

    await decorator.saveAllAndMarkThreadRead([messageFromDoctor], thread);

    assert.equal(inner.savedAllAndMarkThreadRead.length, 1);
    assert.equal(inner.savedAllAndMarkThreadRead[0]!.messages[0], messageFromDoctor);
    assert.equal(emitter.emitted.length, 1);
    assert.equal(emitter.emitted[0]!.accountId, DOCTOR_ACCOUNT_ID);
    assert.equal(emitter.emitted[0]!.event, 'message.read');
    assert.deepEqual(emitter.emitted[0]!.payload, { threadId: thread.getId() });
  });

  it('emits once per distinct sender when marking multiple messages read at once', async () => {
    const thread = buildThread();
    const { decorator, emitter } = buildDecorator({ thread });
    const first = Message.send({ threadId: thread.getId(), senderAccountId: DOCTOR_ACCOUNT_ID, body: 'one' });
    const second = Message.send({ threadId: thread.getId(), senderAccountId: DOCTOR_ACCOUNT_ID, body: 'two' });

    await decorator.saveAllAndMarkThreadRead([first, second], thread);

    assert.equal(emitter.emitted.length, 1);
  });

  it('does not emit on saveAllAndMarkThreadRead when there are no messages', async () => {
    const thread = buildThread();
    const { decorator, emitter } = buildDecorator({ thread });

    await decorator.saveAllAndMarkThreadRead([], thread);

    assert.equal(emitter.emitted.length, 0);
  });

  it('delegates every read method straight to the inner repository without emitting', async () => {
    const thread = buildThread();
    const { decorator, emitter } = buildDecorator({ thread });

    await decorator.findById('x');
    await decorator.findByThreadId(thread.getId());
    await decorator.countUnreadForRecipient(thread.getId(), PATIENT_ACCOUNT_ID);
    await decorator.countUnreadForAccount(PATIENT_ACCOUNT_ID, 'patient');

    assert.equal(emitter.emitted.length, 0);
  });
});
