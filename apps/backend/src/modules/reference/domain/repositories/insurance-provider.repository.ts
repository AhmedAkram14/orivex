import type { InsuranceProvider } from '../entities/insurance-provider.entity.js';

export interface InsuranceProviderRepository {
  findAll(): Promise<InsuranceProvider[]>;
  findById(id: string): Promise<InsuranceProvider | null>;
  save(provider: InsuranceProvider): Promise<void>;
}
