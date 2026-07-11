import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { HealthGraphUpdatedEvent } from '../events/health-graph-updated.event.js';

import { HealthGraphNode, type CreateHealthGraphNodeProps } from './health-graph-node.entity.js';

export interface ReconstituteHealthGraphProps {
  id: string;
  patientId: string;
  createdAt: Date;
  nodes: HealthGraphNode[];
}

// Aggregate root of ClinicalModule (docs/10-backend-architecture.md's
// ClinicalModule entry: "sole owner of clinical truth"). One per patient,
// lazily created ("Created at first encounter",
// docs/09-physical-database.md). Owns HealthGraphNode as a child entity --
// nodes are always loaded/saved as part of this aggregate, never through
// their own repository (docs/07-domain-data-model.md's transactional-
// boundary rule).
export class HealthGraph {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly patientId: string,
    private readonly createdAt: Date,
    private readonly nodes: HealthGraphNode[],
  ) {}

  static create(patientId: string): HealthGraph {
    return new HealthGraph(randomUUID(), patientId, new Date(), []);
  }

  static reconstitute(props: ReconstituteHealthGraphProps): HealthGraph {
    return new HealthGraph(props.id, props.patientId, props.createdAt, props.nodes);
  }

  // Records a new clinical fact (a diagnosis, symptom, medication, etc.).
  // Append-only -- there is no method to mutate an existing node.
  addNode(props: CreateHealthGraphNodeProps): HealthGraphNode {
    const node = HealthGraphNode.create(props);
    this.nodes.push(node);
    this.record(new HealthGraphUpdatedEvent(this.id));
    return node;
  }

  getId(): string {
    return this.id;
  }

  getPatientId(): string {
    return this.patientId;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getNodes(): HealthGraphNode[] {
    return [...this.nodes];
  }

  findNode(nodeId: string): HealthGraphNode | undefined {
    return this.nodes.find((node) => node.getId() === nodeId);
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
