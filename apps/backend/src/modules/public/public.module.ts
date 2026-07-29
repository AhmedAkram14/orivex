import { Module } from '@nestjs/common';

import { ConsultationModule } from '../consultation/consultation.module.js';
import { GetDoctorRatingAggregatesUseCase } from '../consultation/application/use-cases/get-doctor-rating-aggregate/get-doctor-rating-aggregates.use-case.js';
import { ReferenceModule } from '../reference/reference.module.js';
import { ListMedicalSpecialtiesUseCase } from '../reference/application/use-cases/list-medical-specialties/list-medical-specialties.use-case.js';

import { PUBLIC_DIRECTORY_QUERY_PORT } from './application/ports/tokens.js';
import type { PublicDirectoryQueryPort } from './application/ports/public-directory-query.port.js';
import { ListPublicDoctorsUseCase } from './application/use-cases/list-public-doctors/list-public-doctors.use-case.js';
import { ListPublicSpecialtiesUseCase } from './application/use-cases/list-public-specialties/list-public-specialties.use-case.js';
import { PrismaPublicDirectoryQueryService } from './infrastructure/prisma/prisma-public-directory-query.service.js';
import { PublicDoctorsController } from './presentation/controllers/public-doctors.controller.js';
import { PublicSpecialtiesController } from './presentation/controllers/public-specialties.controller.js';

// Public Landing Page (2026-07-29): a thin, unauthenticated read-only
// composition layer -- owns no domain logic of its own, only orchestrates
// ReferenceModule's medical-specialty list and ConsultationModule's rating
// aggregates against its own Prisma query for the doctor/specialty shapes
// neither existing module's port can serve as-is (see
// PublicDirectoryQueryPort's own header comment). Imports ConsultationModule
// rather than DoctorModule directly: DoctorModule cannot safely import
// ConsultationModule (a real ESM circular-module-reference error, confirmed
// by an actual boot attempt -- see DoctorProfileController's own comment),
// but the reverse already holds, and ConsultationModule exports exactly the
// one use case this module needs.
@Module({
  imports: [ReferenceModule, ConsultationModule],
  controllers: [PublicSpecialtiesController, PublicDoctorsController],
  providers: [
    { provide: PUBLIC_DIRECTORY_QUERY_PORT, useClass: PrismaPublicDirectoryQueryService },
    {
      provide: ListPublicSpecialtiesUseCase,
      useFactory: (listMedicalSpecialtiesUseCase: ListMedicalSpecialtiesUseCase, queryPort: PublicDirectoryQueryPort) =>
        new ListPublicSpecialtiesUseCase(listMedicalSpecialtiesUseCase, queryPort),
      inject: [ListMedicalSpecialtiesUseCase, PUBLIC_DIRECTORY_QUERY_PORT],
    },
    {
      provide: ListPublicDoctorsUseCase,
      useFactory: (queryPort: PublicDirectoryQueryPort, getDoctorRatingAggregatesUseCase: GetDoctorRatingAggregatesUseCase) =>
        new ListPublicDoctorsUseCase(queryPort, getDoctorRatingAggregatesUseCase),
      inject: [PUBLIC_DIRECTORY_QUERY_PORT, GetDoctorRatingAggregatesUseCase],
    },
  ],
})
export class PublicModule {}
