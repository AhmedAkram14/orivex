import type { HealthGraphNode } from '../../domain/entities/health-graph-node.entity.js';
import type { CertaintyLevel } from '../../domain/enums/certainty-level.enum.js';
import type { HealthGraphNodeType } from '../../domain/enums/health-graph-node-type.enum.js';
import type { NodeSource } from '../../domain/enums/node-source.enum.js';

// Matches docs/12-openapi.md's HealthGraphNode schema -- icd11Code is
// always null this sprint (ReferenceDataModule doesn't exist).
export class HealthGraphNodeResponseDto {
  id!: string;
  nodeType!: HealthGraphNodeType;
  icd11Code!: null;
  description!: string | null;
  certaintyLevel!: CertaintyLevel;
  source!: NodeSource;
  createdAt!: string;

  static fromDomain(node: HealthGraphNode): HealthGraphNodeResponseDto {
    const dto = new HealthGraphNodeResponseDto();
    dto.id = node.getId();
    dto.nodeType = node.getNodeType();
    dto.icd11Code = null;
    dto.description = node.getFreeTextDescription() ?? null;
    dto.certaintyLevel = node.getCertaintyLevel();
    dto.source = node.getSource();
    dto.createdAt = node.getCreatedAt().toISOString();
    return dto;
  }
}
