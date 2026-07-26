import type { DoctorDirectoryQueryPort, DoctorDirectoryResult } from '../../ports/doctor-directory-query.port.js';

import type { ListDoctorDirectoryQuery } from './list-doctor-directory.query.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// doctor.module.ts only.
export class ListDoctorDirectoryUseCase {
  constructor(private readonly doctorDirectoryQueryPort: DoctorDirectoryQueryPort) {}

  async execute(query: ListDoctorDirectoryQuery): Promise<DoctorDirectoryResult> {
    const offset = (query.page - 1) * query.limit;
    return this.doctorDirectoryQueryPort.search({
      specialty: query.specialty,
      specialtyId: query.specialtyId,
      hospitalId: query.hospitalId,
      limit: query.limit,
      offset,
    });
  }
}
