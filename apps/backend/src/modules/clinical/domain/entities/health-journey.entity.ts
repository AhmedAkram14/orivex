import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { JourneyUpdatedEvent } from '../events/journey-updated.event.js';
import { JourneyStage } from '../enums/journey-stage.enum.js';
import { ClinicalDomainError } from '../exceptions/clinical-domain.error.js';

export interface ReconstituteHealthJourneyProps {
  id: string;
  healthGraphId: string;
  rootNodeId: string;
  stage: JourneyStage;
  linkedNodeIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// docs/07-domain-data-model.md's Health Journey Aggregate ("Root: the
// Journey itself"). References HealthGraph/rootNode by id only -- a
// separate aggregate root, not a HealthGraph child. Stage transitions match
// docs/07-domain-data-model.md's documented state model: Diagnosis ->
// Follow-up -> Monitoring -> (Resolved | Ongoing/Chronic), with Referred
// Out as an exceptional branch reachable from any non-terminal stage.
// Terminal stages never transition further (forward-only rule).
const ALLOWED_TRANSITIONS: Record<JourneyStage, JourneyStage[]> = {
  [JourneyStage.Diagnosis]: [JourneyStage.FollowUp, JourneyStage.ReferredOut],
  [JourneyStage.FollowUp]: [JourneyStage.Monitoring, JourneyStage.ReferredOut],
  [JourneyStage.Monitoring]: [JourneyStage.Resolved, JourneyStage.OngoingChronic, JourneyStage.ReferredOut],
  [JourneyStage.Resolved]: [],
  [JourneyStage.OngoingChronic]: [],
  [JourneyStage.ReferredOut]: [],
};

export class HealthJourney {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly healthGraphId: string,
    private readonly rootNodeId: string,
    private stage: JourneyStage,
    private readonly linkedNodeIds: string[],
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static start(healthGraphId: string, rootNodeId: string): HealthJourney {
    const now = new Date();
    const journey = new HealthJourney(randomUUID(), healthGraphId, rootNodeId, JourneyStage.Diagnosis, [], now, now);
    journey.record(new JourneyUpdatedEvent(journey.id));
    return journey;
  }

  static reconstitute(props: ReconstituteHealthJourneyProps): HealthJourney {
    return new HealthJourney(
      props.id,
      props.healthGraphId,
      props.rootNodeId,
      props.stage,
      props.linkedNodeIds,
      props.createdAt,
      props.updatedAt,
    );
  }

  advanceStage(nextStage: JourneyStage): void {
    if (!ALLOWED_TRANSITIONS[this.stage].includes(nextStage)) {
      throw new ClinicalDomainError(`HealthJourney "${this.id}" cannot transition from ${this.stage} to ${nextStage}.`);
    }
    this.stage = nextStage;
    this.updatedAt = new Date();
    this.record(new JourneyUpdatedEvent(this.id));
  }

  linkNode(nodeId: string): void {
    if (!this.linkedNodeIds.includes(nodeId)) {
      this.linkedNodeIds.push(nodeId);
      this.updatedAt = new Date();
      this.record(new JourneyUpdatedEvent(this.id));
    }
  }

  getId(): string {
    return this.id;
  }

  getHealthGraphId(): string {
    return this.healthGraphId;
  }

  getRootNodeId(): string {
    return this.rootNodeId;
  }

  getStage(): JourneyStage {
    return this.stage;
  }

  getLinkedNodeIds(): string[] {
    return [...this.linkedNodeIds];
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  releaseDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  private record(event: DomainEvent): void {
    this.domainEvents.push(event);
  }
}
