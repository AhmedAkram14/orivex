import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AccountRole } from '../../../../identity/domain/enums/account-role.enum.js';
import type { AppointmentSearchResult, SearchAppointmentsPort } from '../../ports/search-appointments.port.js';
import type { DoctorSearchResult, SearchDoctorsPort } from '../../ports/search-doctors.port.js';
import type { PatientSearchResult, SearchPatientsPort } from '../../ports/search-patients.port.js';

import { GlobalSearchUseCase } from './global-search.use-case.js';

const EMPTY_DOCTORS: DoctorSearchResult = { entries: [], total: 0 };
const EMPTY_PATIENTS: PatientSearchResult = { entries: [], total: 0 };
const EMPTY_APPOINTMENTS: AppointmentSearchResult = { entries: [], total: 0 };

interface Call {
  method: string;
  params: unknown;
}

class FakeDoctorsPort implements SearchDoctorsPort {
  calls: Call[] = [];
  constructor(
    private readonly publicResult: DoctorSearchResult = EMPTY_DOCTORS,
    private readonly adminResult: DoctorSearchResult = EMPTY_DOCTORS,
  ) {}
  async searchPublic(params: { query: string; limit: number }): Promise<DoctorSearchResult> {
    this.calls.push({ method: 'searchPublic', params });
    return this.publicResult;
  }
  async searchAdmin(params: { query: string; limit: number }): Promise<DoctorSearchResult> {
    this.calls.push({ method: 'searchAdmin', params });
    return this.adminResult;
  }
}

class FakePatientsPort implements SearchPatientsPort {
  calls: Call[] = [];
  constructor(
    private readonly forDoctorResult: PatientSearchResult = EMPTY_PATIENTS,
    private readonly adminResult: PatientSearchResult = EMPTY_PATIENTS,
  ) {}
  async searchForDoctor(params: { doctorProfileId: string; query: string; limit: number }): Promise<PatientSearchResult> {
    this.calls.push({ method: 'searchForDoctor', params });
    return this.forDoctorResult;
  }
  async searchAdmin(params: { query: string; limit: number }): Promise<PatientSearchResult> {
    this.calls.push({ method: 'searchAdmin', params });
    return this.adminResult;
  }
}

class FakeAppointmentsPort implements SearchAppointmentsPort {
  calls: Call[] = [];
  constructor(
    private readonly forPatientResult: AppointmentSearchResult = EMPTY_APPOINTMENTS,
    private readonly forDoctorResult: AppointmentSearchResult = EMPTY_APPOINTMENTS,
  ) {}
  async searchForPatient(params: { patientProfileId: string; query: string; limit: number }): Promise<AppointmentSearchResult> {
    this.calls.push({ method: 'searchForPatient', params });
    return this.forPatientResult;
  }
  async searchForDoctor(params: { doctorProfileId: string; query: string; limit: number }): Promise<AppointmentSearchResult> {
    this.calls.push({ method: 'searchForDoctor', params });
    return this.forDoctorResult;
  }
}

function fakeDoctorProfileLookup(id: string | null) {
  return { execute: async () => (id ? { getId: () => id } : null) };
}
function fakePatientProfileLookup(id: string | null) {
  return { execute: async () => (id ? { getId: () => id } : null) };
}

describe('GlobalSearchUseCase', () => {
  it('a query shorter than 2 characters returns empty results with no port ever called', async () => {
    const doctorsPort = new FakeDoctorsPort();
    const patientsPort = new FakePatientsPort();
    const appointmentsPort = new FakeAppointmentsPort();
    const useCase = new GlobalSearchUseCase(
      doctorsPort,
      patientsPort,
      appointmentsPort,
      fakeDoctorProfileLookup('doc-1') as never,
      fakePatientProfileLookup('pat-1') as never,
    );

    const result = await useCase.execute({ accountId: 'a1', role: AccountRole.Patient, q: 'a', limit: 5 });

    assert.deepEqual(result, { results: [], total: 0 });
    assert.equal(doctorsPort.calls.length, 0);
    assert.equal(patientsPort.calls.length, 0);
    assert.equal(appointmentsPort.calls.length, 0);
  });

  it('Patient caller: gets the public doctor directory and only their own appointments, never patients', async () => {
    const doctorsPort = new FakeDoctorsPort({
      entries: [{ doctorProfileId: 'd1', displayName: 'Dr. Amina', specialtyName: 'Cardiology' }],
      total: 1,
    });
    const patientsPort = new FakePatientsPort();
    const appointmentsPort = new FakeAppointmentsPort({
      entries: [{ appointmentId: 'a1', counterpartName: 'Dr. Amina', scheduledAt: new Date('2026-01-01'), status: 'confirmed' }],
      total: 1,
    });
    const useCase = new GlobalSearchUseCase(
      doctorsPort,
      patientsPort,
      appointmentsPort,
      fakeDoctorProfileLookup(null) as never,
      fakePatientProfileLookup('pat-1') as never,
    );

    const result = await useCase.execute({ accountId: 'acc-1', role: AccountRole.Patient, q: 'amina', limit: 5 });

    assert.equal(patientsPort.calls.length, 0);
    assert.equal(doctorsPort.calls[0]?.method, 'searchPublic');
    assert.deepEqual(appointmentsPort.calls[0], {
      method: 'searchForPatient',
      params: { patientProfileId: 'pat-1', query: 'amina', limit: 5 },
    });
    assert.equal(result.total, 2);
    assert.deepEqual(
      result.results.map((r) => r.type),
      ['doctor', 'appointment'],
    );
  });

  it('Patient caller requesting type=patient explicitly still returns zero results and never calls patientsPort', async () => {
    const doctorsPort = new FakeDoctorsPort();
    const patientsPort = new FakePatientsPort();
    const appointmentsPort = new FakeAppointmentsPort();
    const useCase = new GlobalSearchUseCase(
      doctorsPort,
      patientsPort,
      appointmentsPort,
      fakeDoctorProfileLookup(null) as never,
      fakePatientProfileLookup('pat-1') as never,
    );

    const result = await useCase.execute({ accountId: 'acc-1', role: AccountRole.Patient, q: 'query', type: 'patient', limit: 5 });

    assert.deepEqual(result, { results: [], total: 0 });
    assert.equal(patientsPort.calls.length, 0);
    assert.equal(doctorsPort.calls.length, 0);
    assert.equal(appointmentsPort.calls.length, 0);
  });

  it('Doctor caller: never sees other doctors, only patients scoped to their own doctorProfileId, only own appointments', async () => {
    const doctorsPort = new FakeDoctorsPort();
    const patientsPort = new FakePatientsPort({
      entries: [{ patientProfileId: 'p1', displayName: 'John Patient' }],
      total: 1,
    });
    const appointmentsPort = new FakeAppointmentsPort(
      EMPTY_APPOINTMENTS,
      { entries: [{ appointmentId: 'ap1', counterpartName: 'John Patient', scheduledAt: new Date('2026-02-01'), status: 'completed' }], total: 1 },
    );
    const useCase = new GlobalSearchUseCase(
      doctorsPort,
      patientsPort,
      appointmentsPort,
      fakeDoctorProfileLookup('doc-1') as never,
      fakePatientProfileLookup(null) as never,
    );

    const result = await useCase.execute({ accountId: 'acc-2', role: AccountRole.Doctor, q: 'john', limit: 5 });

    assert.equal(doctorsPort.calls.length, 0);
    assert.deepEqual(patientsPort.calls[0], {
      method: 'searchForDoctor',
      params: { doctorProfileId: 'doc-1', query: 'john', limit: 5 },
    });
    assert.deepEqual(appointmentsPort.calls[0], {
      method: 'searchForDoctor',
      params: { doctorProfileId: 'doc-1', query: 'john', limit: 5 },
    });
    assert.deepEqual(
      result.results.map((r) => r.type),
      ['patient', 'appointment'],
    );
  });

  it('SuperAdmin caller: sees doctors and patients platform-wide, but appointments are always omitted', async () => {
    const doctorsPort = new FakeDoctorsPort(EMPTY_DOCTORS, { entries: [{ doctorProfileId: 'd1', displayName: 'Dr. X', specialtyName: null }], total: 1 });
    const patientsPort = new FakePatientsPort(EMPTY_PATIENTS, { entries: [{ patientProfileId: 'p1', displayName: 'Patient X' }], total: 1 });
    const appointmentsPort = new FakeAppointmentsPort();
    const useCase = new GlobalSearchUseCase(
      doctorsPort,
      patientsPort,
      appointmentsPort,
      fakeDoctorProfileLookup(null) as never,
      fakePatientProfileLookup(null) as never,
    );

    const result = await useCase.execute({ accountId: 'acc-3', role: AccountRole.SuperAdmin, q: 'dr x', limit: 5 });

    assert.equal(doctorsPort.calls[0]?.method, 'searchAdmin');
    assert.equal(patientsPort.calls[0]?.method, 'searchAdmin');
    assert.equal(appointmentsPort.calls.length, 0);
    assert.deepEqual(
      result.results.map((r) => r.type).sort(),
      ['doctor', 'patient'],
    );
    assert.equal(result.total, 2);
  });

  it('Nurse (no dedicated workspace) is treated like Patient default: public doctors only, nothing else', async () => {
    const doctorsPort = new FakeDoctorsPort({ entries: [{ doctorProfileId: 'd1', displayName: 'Dr. Y', specialtyName: 'ENT' }], total: 1 });
    const patientsPort = new FakePatientsPort();
    const appointmentsPort = new FakeAppointmentsPort();
    const useCase = new GlobalSearchUseCase(
      doctorsPort,
      patientsPort,
      appointmentsPort,
      fakeDoctorProfileLookup(null) as never,
      fakePatientProfileLookup(null) as never,
    );

    const result = await useCase.execute({ accountId: 'acc-4', role: AccountRole.Nurse, q: 'dr y', limit: 5 });

    assert.equal(doctorsPort.calls[0]?.method, 'searchPublic');
    assert.equal(patientsPort.calls.length, 0);
    assert.equal(appointmentsPort.calls.length, 0);
    assert.deepEqual(
      result.results.map((r) => r.type),
      ['doctor'],
    );
  });

  it('respects the requested limit, forwarding it verbatim to every port call it makes', async () => {
    const doctorsPort = new FakeDoctorsPort();
    const patientsPort = new FakePatientsPort();
    const appointmentsPort = new FakeAppointmentsPort();
    const useCase = new GlobalSearchUseCase(
      doctorsPort,
      patientsPort,
      appointmentsPort,
      fakeDoctorProfileLookup(null) as never,
      fakePatientProfileLookup('pat-9') as never,
    );

    await useCase.execute({ accountId: 'acc-5', role: AccountRole.Patient, q: 'query', limit: 3 });

    assert.equal((doctorsPort.calls[0]?.params as { limit: number }).limit, 3);
    assert.equal((appointmentsPort.calls[0]?.params as { limit: number }).limit, 3);
  });
});
