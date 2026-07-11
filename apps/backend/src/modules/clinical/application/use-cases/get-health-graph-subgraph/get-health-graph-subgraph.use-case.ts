import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { HealthGraphNode } from '../../../domain/entities/health-graph-node.entity.js';
import type { HealthGraphRepository } from '../../../domain/repositories/health-graph.repository.js';

import type { GetHealthGraphSubgraphQuery } from './get-health-graph-subgraph.query.js';

// Matches docs/12-openapi.md's GET /patients/{id}/health-graph exactly.
// rootNodeId scopes the result to that single node -- "connected nodes"
// traversal isn't implemented this sprint since HealthGraphEdge is
// deliberately not modeled (docs/12-openapi.md's response schema for this
// endpoint is HealthGraphNode[] with no edges either). The `tier` query
// parameter is validated at the DTO layer but doesn't change behavior yet
// -- no concrete business rule for what belongs in "summary" vs "full" is
// specified anywhere in the docs.
export class GetHealthGraphSubgraphUseCase {
  constructor(
    private readonly healthGraphRepository: HealthGraphRepository,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
  ) {}

  async execute(query: GetHealthGraphSubgraphQuery): Promise<HealthGraphNode[]> {
    const patient = await this.getPatientProfileByIdUseCase.execute({ patientProfileId: query.patientId });
    if (!patient) {
      throw new NotFoundError(`Patient profile "${query.patientId}" not found.`);
    }

    const graph = await this.healthGraphRepository.findByPatientId(query.patientId);
    if (!graph) {
      return [];
    }

    const nodes = graph.getNodes();
    if (!query.rootNodeId) {
      return nodes;
    }
    const rootNode = nodes.find((node) => node.getId() === query.rootNodeId);
    return rootNode ? [rootNode] : [];
  }
}
