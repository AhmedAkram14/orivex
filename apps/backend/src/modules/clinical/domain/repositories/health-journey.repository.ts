import type { HealthJourney } from '../entities/health-journey.entity.js';

export interface HealthJourneyRepository {
  findById(id: string): Promise<HealthJourney | null>;
  findByHealthGraphId(healthGraphId: string, status?: string): Promise<HealthJourney[]>;
  save(journey: HealthJourney): Promise<void>;
}
