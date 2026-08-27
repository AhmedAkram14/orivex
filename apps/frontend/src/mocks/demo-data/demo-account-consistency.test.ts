import { describe, expect, it, vi } from 'vitest';

// This suite exercises the REAL demo-seeded data (`seedDemoData()`), which
// is otherwise deliberately disabled under Vitest (`DEMO_SEED_ENABLED` is
// `false` whenever `NODE_ENV === 'test'` -- see `demo-mode.ts`'s own
// comment) so the rest of the frontend suite stays small and deterministic.
// Mocking the flag true, isolated to this one file, lets this suite prove
// the actual demo dataset's account-identity consistency without touching
// any other test's fixture reality.
vi.mock('@/mocks/demo-mode', () => ({ DEMO_SEED_ENABLED: true }));

describe('Demo account/profile id consistency (Account-Consistency Fix)', () => {
  it('every patient the Doctor Workspace "Patients" list surfaces resolves to the SAME canonical PatientProfile everywhere else in the mock layer', async () => {
    const { seedDemoData } = await import('@/mocks/demo-data/demo-seeder');
    const { getPatients, getDoctorByAccountId } = await import('@/mocks/doctor-store');
    const { getPatientProfileById, getAppointments, getAccountIdForPatientProfileId } = await import(
      '@/mocks/patient-store'
    );
    const { DEMO_DOCTORS, DEMO_PATIENTS } = await import('@/mocks/demo-data/demo-people');

    seedDemoData();

    const demoPatientProfileIds = new Set(DEMO_PATIENTS.map((_, index) => `patient-profile-demo-${index + 1}`));

    let checkedAtLeastOnePatient = false;

    for (const doctor of DEMO_DOCTORS) {
      const doctorProfile = getDoctorByAccountId(doctor.accountId);
      expect(doctorProfile).not.toBeNull();

      const list = getPatients(doctor.accountId);

      for (const item of list) {
        checkedAtLeastOnePatient = true;

        // 1. The list itself must return a canonical id, never a fabricated
        // one disconnected from patient-store.ts's own profile map.
        expect(demoPatientProfileIds.has(item.patientProfileId)).toBe(true);

        // 2. Clicking "View" resolves the SAME canonical patient profile --
        // the list's own name/email must match what the profile store says
        // for that exact id (proves there's one identity, not two).
        const profile = getPatientProfileById(item.patientProfileId);
        expect(profile).toBeDefined();
        expect(profile?.fullName).toBe(item.patientName);
        expect(profile?.email).toBe(item.email);

        // 3. This patient's real appointments must include at least one
        // real appointment with THIS doctor -- the same relationship the
        // list claims to be showing, never a fabricated/empty one.
        const patientAccountId = getAccountIdForPatientProfileId(item.patientProfileId);
        expect(patientAccountId).toBeDefined();
        const appointments = getAppointments(patientAccountId);
        expect(appointments.some((appointment) => appointment.doctorId === doctorProfile?.id)).toBe(true);
      }
    }

    expect(checkedAtLeastOnePatient).toBe(true);
  });

  it("Doctor A's patient list never contains a patient whose appointments belong only to Doctor B", async () => {
    const { seedDemoData } = await import('@/mocks/demo-data/demo-seeder');
    const { getPatients, getDoctorByAccountId } = await import('@/mocks/doctor-store');
    const { getAccountIdForPatientProfileId, getAppointments } = await import('@/mocks/patient-store');
    const { DEMO_DOCTORS } = await import('@/mocks/demo-data/demo-people');

    seedDemoData();

    const [doctorA, doctorB] = DEMO_DOCTORS;
    const doctorAProfile = getDoctorByAccountId(doctorA.accountId);
    const doctorBProfile = getDoctorByAccountId(doctorB.accountId);
    expect(doctorAProfile).not.toBeNull();
    expect(doctorBProfile).not.toBeNull();

    const listA = getPatients(doctorA.accountId);
    expect(listA.length).toBeGreaterThan(0);

    for (const item of listA) {
      const patientAccountId = getAccountIdForPatientProfileId(item.patientProfileId);
      const appointments = getAppointments(patientAccountId);
      // Every patient on Doctor A's own list must have at least one real
      // appointment with Doctor A specifically -- never surfaced there
      // solely because they also saw Doctor B.
      expect(appointments.some((appointment) => appointment.doctorId === doctorAProfile?.id)).toBe(true);
    }
  });
});
