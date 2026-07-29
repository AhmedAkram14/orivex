import type { ListMedicalSpecialtiesUseCase } from '../../../../reference/application/use-cases/list-medical-specialties/list-medical-specialties.use-case.js';
import type { PublicDirectoryQueryPort } from '../../ports/public-directory-query.port.js';

export interface PublicSpecialty {
  id: string;
  name: string;
  doctorCount: number;
}

// Public Landing Page (2026-07-29): powers the "Browse Specialties" section
// -- active specialties only, each with a real doctor count (never
// hardcoded). Sorted by doctorCount descending so the specialties with an
// actual presence on the platform surface first.
export class ListPublicSpecialtiesUseCase {
  constructor(
    private readonly listMedicalSpecialtiesUseCase: ListMedicalSpecialtiesUseCase,
    private readonly publicDirectoryQueryPort: PublicDirectoryQueryPort,
  ) {}

  async execute(): Promise<PublicSpecialty[]> {
    const [specialties, counts] = await Promise.all([
      this.listMedicalSpecialtiesUseCase.execute(),
      this.publicDirectoryQueryPort.countDoctorsBySpecialty(),
    ]);

    const countBySpecialtyId = new Map(counts.map((count) => [count.specialtyId, count.doctorCount]));

    return specialties
      .filter((specialty) => specialty.getIsActive())
      .map((specialty) => ({
        id: specialty.getId(),
        name: specialty.getName(),
        doctorCount: countBySpecialtyId.get(specialty.getId()) ?? 0,
      }))
      .sort((a, b) => b.doctorCount - a.doctorCount);
  }
}
