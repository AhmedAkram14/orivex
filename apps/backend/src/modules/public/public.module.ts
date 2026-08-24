import { Module } from '@nestjs/common';

import { ConsultationModule } from '../consultation/consultation.module.js';
import { GetDoctorBookingCountsUseCase } from '../consultation/application/use-cases/get-doctor-booking-counts/get-doctor-booking-counts.use-case.js';
import { GetDoctorRatingAggregatesUseCase } from '../consultation/application/use-cases/get-doctor-rating-aggregate/get-doctor-rating-aggregates.use-case.js';
import { IdentityModule } from '../identity/identity.module.js';
import { PatientModule } from '../patient/patient.module.js';
import { ReferenceModule } from '../reference/reference.module.js';
import { ListMedicalSpecialtiesUseCase } from '../reference/application/use-cases/list-medical-specialties/list-medical-specialties.use-case.js';
import { SchedulingModule } from '../scheduling/scheduling.module.js';
import { GetDoctorsOpenOnDatesUseCase } from '../scheduling/application/use-cases/get-doctors-open-on-dates/get-doctors-open-on-dates.use-case.js';

import { PUBLIC_DIRECTORY_QUERY_PORT } from './application/ports/tokens.js';
import type { PublicDirectoryQueryPort } from './application/ports/public-directory-query.port.js';
import { ListPublicDoctorsUseCase } from './application/use-cases/list-public-doctors/list-public-doctors.use-case.js';
import { ListPublicSpecialtiesUseCase } from './application/use-cases/list-public-specialties/list-public-specialties.use-case.js';
import { PrismaPublicDirectoryQueryService } from './infrastructure/prisma/prisma-public-directory-query.service.js';
import { PublicDoctorsController } from './presentation/controllers/public-doctors.controller.js';
import { PublicPatientsController } from './presentation/controllers/public-patients.controller.js';
import { PublicSpecialtiesController } from './presentation/controllers/public-specialties.controller.js';

// Public Landing Page (2026-07-29): a thin, unauthenticated read-only
// composition layer -- owns no domain logic of its own, only orchestrates
// ReferenceModule's medical-specialty list, ConsultationModule's rating and
// booking-count aggregates, and SchedulingModule's open-on-dates signal
// against its own Prisma query for the doctor/specialty shapes neither
// existing module's port can serve as-is (see PublicDirectoryQueryPort's own
// header comment). Imports ConsultationModule rather than DoctorModule
// directly: DoctorModule cannot safely import ConsultationModule (a real ESM
// circular-module-reference error, confirmed by an actual boot attempt --
// see DoctorProfileController's own comment), but the reverse already holds.
// SchedulingModule is safe too -- it only imports DoctorModule and
// AuthenticationGuardsModule, never this module or ConsultationModule.
@Module({
  imports: [ReferenceModule, ConsultationModule, SchedulingModule, PatientModule, IdentityModule],
  controllers: [PublicSpecialtiesController, PublicDoctorsController, PublicPatientsController],
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
      useFactory: (
        queryPort: PublicDirectoryQueryPort,
        getDoctorRatingAggregatesUseCase: GetDoctorRatingAggregatesUseCase,
        getDoctorBookingCountsUseCase: GetDoctorBookingCountsUseCase,
        getDoctorsOpenOnDatesUseCase: GetDoctorsOpenOnDatesUseCase,
      ) =>
        new ListPublicDoctorsUseCase(queryPort, getDoctorRatingAggregatesUseCase, getDoctorBookingCountsUseCase, getDoctorsOpenOnDatesUseCase),
      inject: [PUBLIC_DIRECTORY_QUERY_PORT, GetDoctorRatingAggregatesUseCase, GetDoctorBookingCountsUseCase, GetDoctorsOpenOnDatesUseCase],
    },
  ],
})
export class PublicModule {}
