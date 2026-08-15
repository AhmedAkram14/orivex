import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { AccountRole } from '../../../../identity/domain/enums/account-role.enum.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { SearchAppointmentsPort } from '../../ports/search-appointments.port.js';
import type { SearchDoctorsPort } from '../../ports/search-doctors.port.js';
import type { SearchPatientsPort } from '../../ports/search-patients.port.js';

export type SearchResultType = 'doctor' | 'patient' | 'appointment';

export interface SearchResultItem {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
}

export interface GlobalSearchResult {
  results: SearchResultItem[];
  total: number;
}

export interface GlobalSearchQuery {
  accountId: string;
  // AccessTokenClaims.role is a plain string (never PHI, JWT design rule) --
  // compared against AccountRole's string enum values, not re-typed.
  role: string;
  q: string;
  type?: SearchResultType;
  limit: number;
}

const EMPTY: GlobalSearchResult = { results: [], total: 0 };

// ORIVEX Roadmap Phase 2 -- Real Global Search. Resolves the caller's real
// profile id (never trusts a client-supplied id) and decides per-role scope
// entirely through which port method gets called and with which real id --
// every restriction is a WHERE clause inside the Prisma query services this
// use-case calls, never a post-filter here. See this module's own
// search.module.ts header comment for the full per-role authorization
// matrix this implements.
export class GlobalSearchUseCase {
  constructor(
    private readonly doctorsPort: SearchDoctorsPort,
    private readonly patientsPort: SearchPatientsPort,
    private readonly appointmentsPort: SearchAppointmentsPort,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
  ) {}

  async execute(query: GlobalSearchQuery): Promise<GlobalSearchResult> {
    const q = query.q.trim();
    // Documented API behaviour, not a validation failure: a query under 2
    // characters returns an honest empty result set with no DB query at
    // all, rather than a 400.
    if (q.length < 2) {
      return EMPTY;
    }

    const limit = query.limit;
    const wants = (type: SearchResultType): boolean => !query.type || query.type === type;

    switch (query.role) {
      case AccountRole.Patient:
        return this.searchAsPatient(query.accountId, q, limit, wants);
      case AccountRole.Doctor:
        return this.searchAsDoctor(query.accountId, q, limit, wants);
      case AccountRole.SuperAdmin:
        return this.searchAsSuperAdmin(q, limit, wants);
      default:
        // Nurse / Receptionist / HospitalAdmin: no dedicated workspace
        // exists yet for these roles in this codebase's own state --
        // deliberately treated like Patient's restrictive default (public
        // doctor directory only) rather than inventing new scope for a
        // workspace that doesn't exist.
        return this.searchAsDefaultRestricted(q, limit, wants);
    }
  }

  private async searchAsPatient(
    accountId: string,
    q: string,
    limit: number,
    wants: (type: SearchResultType) => boolean,
  ): Promise<GlobalSearchResult> {
    const patientProfile = wants('appointment')
      ? await this.getPatientProfileByAccountIdUseCase.execute({ accountId })
      : null;

    const [doctors, appointments] = await Promise.all([
      wants('doctor') ? this.doctorsPort.searchPublic({ query: q, limit }) : null,
      patientProfile
        ? this.appointmentsPort.searchForPatient({ patientProfileId: patientProfile.getId(), query: q, limit })
        : null,
    ]);
    // Patients are never searchable by a patient, regardless of `type` --
    // no patientsPort call is ever made in this branch.

    return this.aggregate([
      doctors && this.mapDoctors(doctors.entries, doctors.total),
      appointments && this.mapAppointments(appointments.entries, appointments.total),
    ]);
  }

  private async searchAsDoctor(
    accountId: string,
    q: string,
    limit: number,
    wants: (type: SearchResultType) => boolean,
  ): Promise<GlobalSearchResult> {
    const doctorProfile =
      wants('patient') || wants('appointment')
        ? await this.getDoctorProfileByAccountIdUseCase.execute({ accountId })
        : null;
    const doctorProfileId = doctorProfile?.getId();

    const [patients, appointments] = await Promise.all([
      doctorProfileId && wants('patient')
        ? this.patientsPort.searchForDoctor({ doctorProfileId, query: q, limit })
        : null,
      doctorProfileId && wants('appointment')
        ? this.appointmentsPort.searchForDoctor({ doctorProfileId, query: q, limit })
        : null,
    ]);
    // Doctors never see other doctors here -- no real "doctors browse
    // doctors" journey exists in this product; doctorsPort is never called
    // in this branch.

    return this.aggregate([
      patients && this.mapPatients(patients.entries, patients.total),
      appointments && this.mapAppointments(appointments.entries, appointments.total),
    ]);
  }

  private async searchAsSuperAdmin(
    q: string,
    limit: number,
    wants: (type: SearchResultType) => boolean,
  ): Promise<GlobalSearchResult> {
    const [doctors, patients] = await Promise.all([
      wants('doctor') ? this.doctorsPort.searchAdmin({ query: q, limit }) : null,
      wants('patient') ? this.patientsPort.searchAdmin({ query: q, limit }) : null,
    ]);
    // Appointment search is intentionally omitted for SuperAdmin -- no
    // existing admin appointment-management authorization/endpoint in this
    // codebase to model scope on; not invented this phase.

    return this.aggregate([
      doctors && this.mapDoctors(doctors.entries, doctors.total),
      patients && this.mapPatients(patients.entries, patients.total),
    ]);
  }

  private async searchAsDefaultRestricted(
    q: string,
    limit: number,
    wants: (type: SearchResultType) => boolean,
  ): Promise<GlobalSearchResult> {
    const doctors = wants('doctor') ? await this.doctorsPort.searchPublic({ query: q, limit }) : null;
    return this.aggregate([doctors && this.mapDoctors(doctors.entries, doctors.total)]);
  }

  private mapDoctors(entries: { doctorProfileId: string; displayName: string; specialtyName: string | null }[], total: number) {
    return {
      total,
      results: entries.map<SearchResultItem>((row) => ({
        type: 'doctor',
        id: row.doctorProfileId,
        title: row.displayName,
        subtitle: row.specialtyName ?? '',
      })),
    };
  }

  private mapPatients(entries: { patientProfileId: string; displayName: string }[], total: number) {
    return {
      total,
      results: entries.map<SearchResultItem>((row) => ({
        type: 'patient',
        id: row.patientProfileId,
        title: row.displayName,
        subtitle: 'Patient',
      })),
    };
  }

  private mapAppointments(
    entries: { appointmentId: string; counterpartName: string; scheduledAt: Date; status: string }[],
    total: number,
  ) {
    return {
      total,
      results: entries.map<SearchResultItem>((row) => ({
        type: 'appointment',
        id: row.appointmentId,
        title: row.counterpartName,
        subtitle: `${row.status} · ${row.scheduledAt.toISOString().slice(0, 10)}`,
      })),
    };
  }

  private aggregate(sections: ({ total: number; results: SearchResultItem[] } | null)[]): GlobalSearchResult {
    const present = sections.filter((s): s is { total: number; results: SearchResultItem[] } => s !== null);
    return {
      results: present.flatMap((s) => s.results),
      total: present.reduce((sum, s) => sum + s.total, 0),
    };
  }
}
