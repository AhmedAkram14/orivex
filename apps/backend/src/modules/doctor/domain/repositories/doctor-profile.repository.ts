import type { DoctorProfile } from '../entities/doctor-profile.entity.js';

// Port only. One repository per aggregate root — no separate repository
// for PortfolioPublication/PortfolioAward, loaded/saved only as part of
// their owning DoctorProfile.
export interface DoctorProfileRepository {
  findById(id: string): Promise<DoctorProfile | null>;
  findByAccountId(accountId: string): Promise<DoctorProfile | null>;
  save(profile: DoctorProfile): Promise<void>;
}
