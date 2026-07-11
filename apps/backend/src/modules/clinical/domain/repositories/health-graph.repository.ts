import type { HealthGraph } from '../entities/health-graph.entity.js';

export interface HealthGraphRepository {
  findById(id: string): Promise<HealthGraph | null>;
  findByPatientId(patientId: string): Promise<HealthGraph | null>;
  save(healthGraph: HealthGraph): Promise<void>;
}
