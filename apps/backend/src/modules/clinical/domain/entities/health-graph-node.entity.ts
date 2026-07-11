import { randomUUID } from 'node:crypto';

import { CertaintyLevel } from '../enums/certainty-level.enum.js';
import { NodeSource } from '../enums/node-source.enum.js';
import type { HealthGraphNodeType } from '../enums/health-graph-node-type.enum.js';
import { ClinicalDomainError } from '../exceptions/clinical-domain.error.js';

export interface CreateHealthGraphNodeProps {
  nodeType: HealthGraphNodeType;
  freeTextDescription?: string;
  certaintyLevel?: CertaintyLevel;
  source?: NodeSource;
  authoringDoctorId?: string;
  consultationSessionId?: string;
  supersedesNodeId?: string;
}

export interface ReconstituteHealthGraphNodeProps {
  id: string;
  nodeType: HealthGraphNodeType;
  freeTextDescription?: string;
  certaintyLevel: CertaintyLevel;
  source: NodeSource;
  authoringDoctorId?: string;
  consultationSessionId?: string;
  supersedesNodeId?: string;
  createdAt: Date;
}

// Child entity of the HealthGraph aggregate (docs/07-domain-data-model.md's
// Health Graph Aggregate: "Root: the patient's Health Graph... Child
// entities: individual nodes"). Append-only, never updated in place
// (docs/09-physical-database.md) -- no mutation methods; an evolving fact
// is a new node referencing the prior one via supersedesNodeId. icd11Code
// is deliberately not modeled -- ReferenceDataModule doesn't exist.
export class HealthGraphNode {
  private constructor(
    private readonly id: string,
    private readonly nodeType: HealthGraphNodeType,
    private readonly freeTextDescription: string | undefined,
    private readonly certaintyLevel: CertaintyLevel,
    private readonly source: NodeSource,
    private readonly authoringDoctorId: string | undefined,
    private readonly consultationSessionId: string | undefined,
    private readonly supersedesNodeId: string | undefined,
    private readonly createdAt: Date,
  ) {}

  static create(props: CreateHealthGraphNodeProps): HealthGraphNode {
    if (props.source === undefined || props.source === NodeSource.Clinical) {
      if (!props.authoringDoctorId) {
        throw new ClinicalDomainError('authoringDoctorId is required for a clinically-sourced node.');
      }
    }

    return new HealthGraphNode(
      randomUUID(),
      props.nodeType,
      props.freeTextDescription?.trim(),
      props.certaintyLevel ?? CertaintyLevel.Suspected,
      props.source ?? NodeSource.Clinical,
      props.authoringDoctorId,
      props.consultationSessionId,
      props.supersedesNodeId,
      new Date(),
    );
  }

  static reconstitute(props: ReconstituteHealthGraphNodeProps): HealthGraphNode {
    return new HealthGraphNode(
      props.id,
      props.nodeType,
      props.freeTextDescription,
      props.certaintyLevel,
      props.source,
      props.authoringDoctorId,
      props.consultationSessionId,
      props.supersedesNodeId,
      props.createdAt,
    );
  }

  getId(): string {
    return this.id;
  }

  getNodeType(): HealthGraphNodeType {
    return this.nodeType;
  }

  getFreeTextDescription(): string | undefined {
    return this.freeTextDescription;
  }

  getCertaintyLevel(): CertaintyLevel {
    return this.certaintyLevel;
  }

  getSource(): NodeSource {
    return this.source;
  }

  getAuthoringDoctorId(): string | undefined {
    return this.authoringDoctorId;
  }

  getConsultationSessionId(): string | undefined {
    return this.consultationSessionId;
  }

  getSupersedesNodeId(): string | undefined {
    return this.supersedesNodeId;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
