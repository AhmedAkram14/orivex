import { Module } from '@nestjs/common';

import { AuthenticationGuardsModule } from '../authentication/authentication-guards.module.js';
import { DoctorModule } from '../doctor/doctor.module.js';
import { GetDoctorProfileByAccountIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { PatientModule } from '../patient/patient.module.js';
import { GetPatientProfileByAccountIdUseCase } from '../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';

import { SEARCH_APPOINTMENTS_QUERY, SEARCH_DOCTORS_QUERY, SEARCH_PATIENTS_QUERY } from './application/ports/tokens.js';
import type { SearchAppointmentsPort } from './application/ports/search-appointments.port.js';
import type { SearchDoctorsPort } from './application/ports/search-doctors.port.js';
import type { SearchPatientsPort } from './application/ports/search-patients.port.js';
import { GlobalSearchUseCase } from './application/use-cases/global-search/global-search.use-case.js';
import { PrismaSearchAppointmentsQueryService } from './infrastructure/prisma/prisma-search-appointments-query.service.js';
import { PrismaSearchDoctorsQueryService } from './infrastructure/prisma/prisma-search-doctors-query.service.js';
import { PrismaSearchPatientsQueryService } from './infrastructure/prisma/prisma-search-patients-query.service.js';
import { SearchController } from './presentation/controllers/search.controller.js';

// ORIVEX Roadmap Phase 2 -- Real Global Search. Modeled directly on
// ReportingModule: no domain entities of its own (nothing is persisted),
// reads across DoctorProfile/PatientProfile/Appointment/Account via its own
// direct Prisma queries (application/{ports,use-cases},
// infrastructure/prisma, presentation/{controllers,dto}), never reaching
// into DoctorModule's/PatientModule's own repositories. Those two modules
// are imported only for their published GetDoctorProfileByAccountIdUseCase /
// GetPatientProfileByAccountIdUseCase (resolving the caller's real profile
// id from their JWT accountId -- same pattern AISuggestionController
// already uses), never their repository tokens.
//
// Per-role authorization matrix implemented in GlobalSearchUseCase (every
// restriction is a real Prisma WHERE clause in this module's own query
// services, never a post-filter):
//   Patient:      doctors = public directory (unrestricted); patients =
//                 never searchable; appointments = own only
//                 (WHERE patientId = caller).
//   Doctor:       doctors = omitted entirely; patients = only patients with
//                 a real Appointment WHERE doctorId = caller; appointments =
//                 own only (WHERE doctorId = caller).
//   SuperAdmin:   doctors + patients = platform-wide (Account.displayName,
//                 mirrors GET /admin/accounts); appointments = omitted
//                 entirely (no existing admin appointment-management
//                 authorization to model scope on).
//   Nurse / Receptionist / HospitalAdmin: no dedicated workspace exists yet
//                 for these roles in this codebase's own state -- treated
//                 like Patient's restrictive default (public doctor
//                 directory only), not a new invented scope.
@Module({
  imports: [AuthenticationGuardsModule, DoctorModule, PatientModule],
  controllers: [SearchController],
  providers: [
    { provide: SEARCH_DOCTORS_QUERY, useClass: PrismaSearchDoctorsQueryService },
    { provide: SEARCH_PATIENTS_QUERY, useClass: PrismaSearchPatientsQueryService },
    { provide: SEARCH_APPOINTMENTS_QUERY, useClass: PrismaSearchAppointmentsQueryService },
    {
      provide: GlobalSearchUseCase,
      useFactory: (
        doctorsPort: SearchDoctorsPort,
        patientsPort: SearchPatientsPort,
        appointmentsPort: SearchAppointmentsPort,
        getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
        getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
      ) =>
        new GlobalSearchUseCase(
          doctorsPort,
          patientsPort,
          appointmentsPort,
          getDoctorProfileByAccountIdUseCase,
          getPatientProfileByAccountIdUseCase,
        ),
      inject: [
        SEARCH_DOCTORS_QUERY,
        SEARCH_PATIENTS_QUERY,
        SEARCH_APPOINTMENTS_QUERY,
        GetDoctorProfileByAccountIdUseCase,
        GetPatientProfileByAccountIdUseCase,
      ],
    },
  ],
})
export class SearchModule {}
