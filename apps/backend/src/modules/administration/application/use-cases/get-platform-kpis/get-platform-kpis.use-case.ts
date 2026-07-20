import { AccountRole } from '../../../../identity/domain/enums/account-role.enum.js';
import type { ListAccountsUseCase } from '../../../../identity/application/use-cases/list-accounts/list-accounts.use-case.js';
import { ListAccountsQuery } from '../../../../identity/application/use-cases/list-accounts/list-accounts.query.js';
import type { HospitalRepository } from '../../../domain/repositories/hospital.repository.js';

import type { GetPlatformKpisResult } from './get-platform-kpis.result.js';

// ORIVEX Roadmap 2.0 Stage 4: AdministrationModule's Overview KPI tiles.
// Delegates to IdentityModule's own exported ListAccountsUseCase for role
// counts (the same one-way-dependency shape GetVerificationReviewQueueUseCase
// already established for TrustModule) — Administration never queries
// Identity's repository directly.
//
// Deliberately scoped to identity-owned counts only: "today's appointment
// count" and "revenue-to-date" (both named in this stage's original plan)
// are deferred to Stage 9 (Reporting & Analytics), which is where the
// roadmap already allocates real aggregation queries over Appointment/
// PaymentTransaction. Adding ad-hoc count/sum methods to those two
// repositories' ports here would ripple through 25+ hand-written test
// fakes across ConsultationModule/PaymentModule for a dashboard tile --
// better done once, deliberately, alongside Stage 9's own reporting work.
// See Stage 4's roadmap completion note for the full rationale.
export class GetPlatformKpisUseCase {
  constructor(
    private readonly listAccountsUseCase: ListAccountsUseCase,
    private readonly hospitalRepository: HospitalRepository,
  ) {}

  async execute(): Promise<GetPlatformKpisResult> {
    const [doctors, patients, hospitals] = await Promise.all([
      this.listAccountsUseCase.execute(new ListAccountsQuery({ page: 1, limit: 1, role: AccountRole.Doctor })),
      this.listAccountsUseCase.execute(new ListAccountsQuery({ page: 1, limit: 1, role: AccountRole.Patient })),
      this.hospitalRepository.findAll(),
    ]);

    return {
      activeDoctorCount: doctors.total,
      activePatientCount: patients.total,
      hospitalCount: hospitals.length,
    };
  }
}
