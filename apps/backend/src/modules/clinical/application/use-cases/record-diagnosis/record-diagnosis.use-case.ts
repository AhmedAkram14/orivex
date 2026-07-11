import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { HealthGraph } from '../../../domain/entities/health-graph.entity.js';
import type { HealthGraphNode } from '../../../domain/entities/health-graph-node.entity.js';
import { HealthJourney } from '../../../domain/entities/health-journey.entity.js';
import type { HealthGraphRepository } from '../../../domain/repositories/health-graph.repository.js';
import type { HealthJourneyRepository } from '../../../domain/repositories/health-journey.repository.js';

import type { RecordDiagnosisCommand } from './record-diagnosis.command.js';

export interface RecordDiagnosisResult {
  node: HealthGraphNode;
  journey?: HealthJourney;
}

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// clinical.module.ts only.
//
// Internal application capability, not wired to any controller this
// sprint -- docs/12-openapi.md documents no endpoint that creates a
// diagnosis node directly. This is "the minimum clinical context required
// by downstream modules" (IMPLEMENTATION_PLAN.md's Sprint 10 scope):
// Sprint 11's Prescription workflow needs a real, referenceable
// diagnosisNodeId, and this use case is how one gets created. Exported for
// that future consumer, same "export ahead of an unbuilt consumer"
// precedent as Trust's ListPendingVerificationCasesUseCase.
export class RecordDiagnosisUseCase {
  constructor(
    private readonly healthGraphRepository: HealthGraphRepository,
    private readonly healthJourneyRepository: HealthJourneyRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
  ) {}

  async execute(command: RecordDiagnosisCommand): Promise<RecordDiagnosisResult> {
    const patient = await this.getPatientProfileByIdUseCase.execute({ patientProfileId: command.patientId });
    if (!patient) {
      throw new NotFoundError(`Patient profile "${command.patientId}" not found.`);
    }

    const doctor = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: command.doctorId });
    if (!doctor) {
      throw new NotFoundError(`Doctor profile "${command.doctorId}" not found.`);
    }

    const graph = (await this.healthGraphRepository.findByPatientId(command.patientId)) ?? HealthGraph.create(command.patientId);

    const node = graph.addNode({
      nodeType: command.nodeType,
      freeTextDescription: command.freeTextDescription,
      certaintyLevel: command.certaintyLevel,
      authoringDoctorId: command.doctorId,
      consultationSessionId: command.consultationSessionId,
    });

    await this.healthGraphRepository.save(graph);
    await this.eventDispatcher.dispatch(graph.releaseDomainEvents());

    if (!command.startJourney) {
      return { node };
    }

    const journey = HealthJourney.start(graph.getId(), node.getId());
    await this.healthJourneyRepository.save(journey);
    await this.eventDispatcher.dispatch(journey.releaseDomainEvents());

    return { node, journey };
  }
}
