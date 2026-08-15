import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { getCurrentAccount } from '@/mocks/auth-store';
import { getPatients as getDoctorPatients, getProfile as getDoctorProfile, getUpcomingWork } from '@/mocks/doctor-store';
import { getAppointments as getPatientAppointments } from '@/mocks/patient-store';
import { listAccounts } from '@/mocks/admin-store';
import { listSpecialties } from '@/mocks/reference-store';
import type { SearchResultDto, SearchResultType } from '@/features/search/api/types';

const base = () => env.apiBaseUrl;

function matches(q: string, text: string): boolean {
  return text.toLowerCase().includes(q.toLowerCase());
}

function doctorResults(q: string): SearchResultDto[] {
  const profile = getDoctorProfile();
  if (!matches(q, profile.fullName)) return [];
  const specialtyName = listSpecialties().find((specialty) => specialty.id === profile.specialtyId)?.name ?? '';
  return [{ type: 'doctor', id: profile.id, title: profile.fullName, subtitle: specialtyName }];
}

function patientResultsForDoctor(q: string): SearchResultDto[] {
  return getDoctorPatients()
    .filter((patient) => matches(q, patient.patientName))
    .map((patient) => ({ type: 'patient', id: patient.patientProfileId, title: patient.patientName, subtitle: 'Patient' }));
}

function patientResultsForAdmin(q: string): SearchResultDto[] {
  return listAccounts({}).accounts
    .filter((account) => account.role === 'patient' && matches(q, account.displayName))
    .map((account) => ({ type: 'patient', id: account.id, title: account.displayName, subtitle: 'Patient' }));
}

function appointmentResultsForPatient(q: string): SearchResultDto[] {
  return getPatientAppointments()
    .filter((appointment) => matches(q, appointment.doctorName))
    .map((appointment) => ({
      type: 'appointment',
      id: appointment.id,
      title: appointment.doctorName,
      subtitle: `${appointment.status} · ${appointment.scheduledAt.slice(0, 10)}`,
    }));
}

function appointmentResultsForDoctor(q: string): SearchResultDto[] {
  return getUpcomingWork()
    .filter((item) => matches(q, item.title))
    .map((item) => ({
      type: 'appointment',
      id: item.id,
      title: item.title,
      subtitle: `${item.status} · ${item.scheduledAt.slice(0, 10)}`,
    }));
}

/**
 * Mirrors the real backend's own per-role result-type restriction exactly
 * (Patient -> doctor+appointment, Doctor -> patient+appointment, SuperAdmin
 * -> doctor+patient, other roles -> doctor-only) -- resolved off the mock
 * auth-store's current session, matching `handlers/auth.ts`'s own
 * `getCurrentAccount()` precedent.
 */
function resultsForRole(role: string | undefined, q: string): SearchResultDto[] {
  if (role === 'patient') return [...doctorResults(q), ...appointmentResultsForPatient(q)];
  if (role === 'doctor') return [...patientResultsForDoctor(q), ...appointmentResultsForDoctor(q)];
  if (role === 'super_admin') return [...doctorResults(q), ...patientResultsForAdmin(q)];
  // Nurse/Receptionist/HospitalAdmin: doctor-only.
  return [...doctorResults(q)];
}

/**
 * Backs `GET /search` (ORIVEX Roadmap Phase 2 -- Real Global Search), a real
 * backend endpoint (verified, finalized contract) -- this handler exists
 * purely to keep the frontend test suite deterministic, matching every
 * other real-endpoint handler in this directory. Results are always derived
 * from the SAME seeded mock stores every other feature already uses
 * (`doctor-store.ts`/`patient-store.ts`/`admin-store.ts`), filtered with the
 * same case-insensitive `contains` rule the real backend uses -- never a
 * separate fabricated dataset.
 */
export const searchHandlers = [
  http.get(`${base()}/search`, ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    const type = url.searchParams.get('type') as SearchResultType | null;
    const limit = Number(url.searchParams.get('limit') ?? '5');

    if (q.length < 2) {
      return HttpResponse.json({ data: { results: [], total: 0 } });
    }

    const account = getCurrentAccount();
    let results = resultsForRole(account?.roles[0], q);
    if (type) results = results.filter((result) => result.type === type);
    const boundedLimit = Math.min(Math.max(limit, 1), 10);

    return HttpResponse.json({ data: { results: results.slice(0, boundedLimit), total: results.length } });
  }),
];
