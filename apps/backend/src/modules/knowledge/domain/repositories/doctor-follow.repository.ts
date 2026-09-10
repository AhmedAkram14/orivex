import type { DoctorFollow } from '../entities/doctor-follow.entity.js';

export interface DoctorFollowRepository {
  findByPatientAndDoctor(patientId: string, doctorId: string): Promise<DoctorFollow | null>;
  /** The caller's own followed doctors, newest first. */
  listByPatientId(patientId: string): Promise<DoctorFollow[]>;
  save(follow: DoctorFollow): Promise<void>;
  delete(id: string): Promise<void>;
}
