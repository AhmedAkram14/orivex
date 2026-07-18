import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ForbiddenError, NotFoundError, ValidationError } from '../../../../../shared/errors/app-error.js';
import { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { Appointment } from '../../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationSession } from '../../../../consultation/domain/entities/consultation-session.entity.js';
import { ConsultationType } from '../../../../consultation/domain/enums/consultation-type.enum.js';
import type { AppointmentRepository } from '../../../../consultation/domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../../consultation/domain/repositories/consultation-session.repository.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import { HealthGraph } from '../../../domain/entities/health-graph.entity.js';
import { HealthGraphNodeType } from '../../../domain/enums/health-graph-node-type.enum.js';
import { PrescriptionStatus } from '../../../domain/enums/prescription-status.enum.js';
import type { Prescription } from '../../../domain/entities/prescription.entity.js';
import type { HealthGraphRepository } from '../../../domain/repositories/health-graph.repository.js';
import type { PendingAISuggestionAcknowledgmentRepository } from '../../../domain/repositories/pending-ai-suggestion-acknowledgment.repository.js';
import type { PrescriptionRepository } from '../../../domain/repositories/prescription.repository.js';
import { GetHealthGraphSubgraphUseCase } from '../get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';

import { SignPrescriptionCommand } from './sign-prescription.command.js';
import { SignPrescriptionUseCase } from './sign-prescription.use-case.js';

class FakePatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profile: PatientProfile | null) {}
  async findById(): Promise<PatientProfile | null> {
    return this.profile;
  }
  async findByAccountId(): Promise<PatientProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profile: DoctorProfile | null) {}
  async findById(): Promise<DoctorProfile | null> {
    return this.profile;
  }
  async findByAccountId(): Promise<DoctorProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class FakeConsultationSessionRepository implements ConsultationSessionRepository {
  constructor(private readonly session: ConsultationSession | null) {}
  async findById(): Promise<ConsultationSession | null> {
    return this.session;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class FakeAppointmentRepository implements AppointmentRepository {
  constructor(private readonly appointment: Appointment | null) {}
  async findById(): Promise<Appointment | null> {
    return this.appointment;
  }
  async findByPatientId(patientId: string): Promise<Appointment[]> {
    return this.appointment && this.appointment.getPatientId() === patientId ? [this.appointment] : [];
  }
  async findByPatientIdPage(patientId: string, skip: number, take: number): Promise<Appointment[]> {
    return (await this.findByPatientId(patientId)).slice(skip, skip + take);
  }
  async countByPatientId(patientId: string): Promise<number> {
    return (await this.findByPatientId(patientId)).length;
  }
  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    return this.appointment && this.appointment.getDoctorId() === doctorId ? [this.appointment] : [];
  }
  async findByDoctorIdForDateRange(doctorId: string): Promise<Appointment[]> {
    return this.findByDoctorId(doctorId);
  }
  async save(): Promise<void> {}
}

class FakeHealthGraphRepository implements HealthGraphRepository {
  constructor(private readonly graph: HealthGraph | null) {}
  async findById(): Promise<HealthGraph | null> {
    return this.graph;
  }
  async findByPatientId(): Promise<HealthGraph | null> {
    return this.graph;
  }
  async save(): Promise<void> {}
}

class FakePrescriptionRepository implements PrescriptionRepository {
  public readonly saved: Prescription[] = [];
  async findById(): Promise<Prescription | null> {
    return null;
  }
  async findByConsultationSessionId(): Promise<Prescription[]> {
    return [];
  }
  async save(prescription: Prescription): Promise<void> {
    this.saved.push(prescription);
  }
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}

  subscribe(): void {}
}

class FakePendingAISuggestionAcknowledgmentRepository implements PendingAISuggestionAcknowledgmentRepository {
  constructor(private readonly unacknowledged: boolean = false) {}
  async createPending(): Promise<void> {}
  async acknowledge(): Promise<void> {}
  async hasUnacknowledged(): Promise<boolean> {
    return this.unacknowledged;
  }
}

function buildScenario() {
  const appointment = Appointment.request({
    patientId: '11111111-1111-4111-8111-111111111111',
    doctorId: '22222222-2222-4222-8222-222222222222',
    availabilityWindowId: '33333333-3333-4333-8333-333333333333',
    consultationType: ConsultationType.Free,
    scheduledAt: new Date(Date.now() + 60 * 60_000),
  });
  const session = ConsultationSession.open(appointment.getId());
  const graph = HealthGraph.create(appointment.getPatientId());
  const node = graph.addNode({ nodeType: HealthGraphNodeType.Condition, authoringDoctorId: appointment.getDoctorId() });
  return { appointment, session, graph, node };
}

function buildUseCase(props: {
  appointment: Appointment | null;
  session: ConsultationSession | null;
  doctor: DoctorProfile | null;
  graph: HealthGraph | null;
  prescriptionRepo: FakePrescriptionRepository;
  hasUnacknowledgedWarning?: boolean;
}): SignPrescriptionUseCase {
  return new SignPrescriptionUseCase(
    props.prescriptionRepo,
    new NoopDispatcher(),
    new GetConsultationSessionByIdUseCase(new FakeConsultationSessionRepository(props.session)),
    new GetAppointmentByIdUseCase(new FakeAppointmentRepository(props.appointment)),
    new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(props.doctor)),
    new GetHealthGraphSubgraphUseCase(
      new FakeHealthGraphRepository(props.graph),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository({} as PatientProfile)),
    ),
    new FakePendingAISuggestionAcknowledgmentRepository(props.hasUnacknowledgedWarning ?? false),
  );
}

describe('SignPrescriptionUseCase', () => {
  it('signs a prescription for a valid session, doctor, and diagnosis node', async () => {
    const { appointment, session, graph, node } = buildScenario();
    const prescriptionRepo = new FakePrescriptionRepository();
    const useCase = buildUseCase({
      appointment,
      session,
      doctor: {} as DoctorProfile,
      graph,
      prescriptionRepo,
    });

    const prescription = await useCase.execute(
      new SignPrescriptionCommand({
        consultationSessionId: session.getId(),
        diagnosisNodeId: node.getId(),
        authoringDoctorId: appointment.getDoctorId(),
        lineItems: [{ drugCatalogId: '44444444-4444-4444-8444-444444444444', dosage: '5mg', frequency: 'once daily', durationDays: 30 }],
      }),
    );

    assert.equal(prescription.getStatus(), PrescriptionStatus.Signed);
    assert.equal(prescriptionRepo.saved.length, 1);
  });

  it('throws NotFoundError when the consultation session does not exist', async () => {
    const { appointment, graph, node } = buildScenario();
    const useCase = buildUseCase({
      appointment,
      session: null,
      doctor: {} as DoctorProfile,
      graph,
      prescriptionRepo: new FakePrescriptionRepository(),
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new SignPrescriptionCommand({
            consultationSessionId: 'missing-id',
            diagnosisNodeId: node.getId(),
            authoringDoctorId: appointment.getDoctorId(),
            lineItems: [{ drugCatalogId: '44444444-4444-4444-8444-444444444444', dosage: '5mg', frequency: 'once daily', durationDays: 30 }],
          }),
        ),
      NotFoundError,
    );
  });

  it('throws NotFoundError when the doctor does not exist', async () => {
    const { appointment, session, graph, node } = buildScenario();
    const useCase = buildUseCase({
      appointment,
      session,
      doctor: null,
      graph,
      prescriptionRepo: new FakePrescriptionRepository(),
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new SignPrescriptionCommand({
            consultationSessionId: session.getId(),
            diagnosisNodeId: node.getId(),
            authoringDoctorId: 'missing-id',
            lineItems: [{ drugCatalogId: '44444444-4444-4444-8444-444444444444', dosage: '5mg', frequency: 'once daily', durationDays: 30 }],
          }),
        ),
      NotFoundError,
    );
  });

  it('throws NotFoundError when the diagnosisNodeId does not exist for the patient', async () => {
    const { appointment, session, graph } = buildScenario();
    const useCase = buildUseCase({
      appointment,
      session,
      doctor: {} as DoctorProfile,
      graph,
      prescriptionRepo: new FakePrescriptionRepository(),
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new SignPrescriptionCommand({
            consultationSessionId: session.getId(),
            diagnosisNodeId: '99999999-9999-4999-8999-999999999999',
            authoringDoctorId: appointment.getDoctorId(),
            lineItems: [{ drugCatalogId: '44444444-4444-4444-8444-444444444444', dosage: '5mg', frequency: 'once daily', durationDays: 30 }],
          }),
        ),
      NotFoundError,
    );
  });

  it('throws ForbiddenError when authoringDoctorId is not the appointment\'s treating doctor', async () => {
    const { appointment, session, graph, node } = buildScenario();
    const useCase = buildUseCase({
      appointment,
      session,
      doctor: {} as DoctorProfile,
      graph,
      prescriptionRepo: new FakePrescriptionRepository(),
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new SignPrescriptionCommand({
            consultationSessionId: session.getId(),
            diagnosisNodeId: node.getId(),
            authoringDoctorId: '55555555-5555-4555-8555-555555555555',
            lineItems: [{ drugCatalogId: '44444444-4444-4444-8444-444444444444', dosage: '5mg', frequency: 'once daily', durationDays: 30 }],
          }),
        ),
      ForbiddenError,
    );
  });

  it('throws ValidationError when an unacknowledged Warning-tier AI suggestion exists for the consultation', async () => {
    const { appointment, session, graph, node } = buildScenario();
    const useCase = buildUseCase({
      appointment,
      session,
      doctor: {} as DoctorProfile,
      graph,
      prescriptionRepo: new FakePrescriptionRepository(),
      hasUnacknowledgedWarning: true,
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new SignPrescriptionCommand({
            consultationSessionId: session.getId(),
            diagnosisNodeId: node.getId(),
            authoringDoctorId: appointment.getDoctorId(),
            lineItems: [{ drugCatalogId: '44444444-4444-4444-8444-444444444444', dosage: '5mg', frequency: 'once daily', durationDays: 30 }],
          }),
        ),
      ValidationError,
    );
  });
});
