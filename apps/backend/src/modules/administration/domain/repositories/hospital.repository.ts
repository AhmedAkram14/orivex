import type { Hospital } from '../entities/hospital.entity.js';

export interface HospitalRepository {
  findAll(): Promise<Hospital[]>;
  findById(id: string): Promise<Hospital | null>;
  save(hospital: Hospital): Promise<void>;
}
