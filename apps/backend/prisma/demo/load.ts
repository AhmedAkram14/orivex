/**
 * Demo timeline -- reads the demo population the identity seed created
 * (accounts, profiles, weekly hours, verification cases). Strictly scoped to
 * the allow-list in core.ts; never reads or returns any other account.
 */
import type { PrismaClient } from '@prisma/client';

import { DEMO_ADMIN_EMAIL, DEMO_DOCTOR_EMAILS, DEMO_HOSPITAL_ADMIN_EMAIL, DEMO_PATIENT_EMAILS } from './core.js';
import type { Specialty } from './catalog/clinical.js';

export interface WorkingDay {
  dayOfWeek: string; // SUNDAY..SATURDAY
  isWorkingDay: boolean;
  startTime: string;
  endTime: string;
  breaks: { start: string; end: string }[];
  pricingType: 'FREE' | 'PAID';
  feeAmount: number | null;
  feeCurrency: string | null;
}

export interface DemoDoctorRecord {
  key: string; // 'doctor03'
  email: string;
  accountId: string;
  profileId: string;
  displayName: string;
  specialty: Specialty;
  specialtyId: string;
  role: string;
  workingDays: WorkingDay[];
  bufferMinutes: number;
  verificationCaseIds: { id: string; status: string; submittedAt: Date }[];
  hospitalId: string | null;
}

export interface DemoPatientRecord {
  key: string;
  email: string;
  accountId: string;
  profileId: string;
  displayName: string;
  firstName: string;
  gender: 'male' | 'female';
  dateOfBirth: Date | null;
  allergies: string | null;
  bloodType: string | null;
  insuranceProviderId: string | null;
  healthGraphId: string | null;
  verificationCases: { id: string; status: string; submittedAt: Date }[];
}

export interface DemoPopulation {
  doctors: Map<string, DemoDoctorRecord>;
  patients: Map<string, DemoPatientRecord>;
  adminAccountId: string;
  hospitalAdminAccountId: string | null;
  missing: string[];
}

const keyOf = (email: string): string => email.split('@')[0];

export async function loadPopulation(prisma: PrismaClient): Promise<DemoPopulation> {
  const missing: string[] = [];

  const doctorAccounts = await prisma.account.findMany({
    where: { email: { in: DEMO_DOCTOR_EMAILS } },
    include: {
      doctorProfile: { include: { medicalSpecialty: true, workingHoursDays: true } },
      verificationCases: { orderBy: { submittedAt: 'asc' } },
    },
  });
  const doctors = new Map<string, DemoDoctorRecord>();
  for (const email of DEMO_DOCTOR_EMAILS) {
    const account = doctorAccounts.find((row) => row.email === email);
    const profile = account?.doctorProfile;
    if (!account || !profile) {
      missing.push(email);
      continue;
    }
    doctors.set(keyOf(email), {
      key: keyOf(email),
      email,
      accountId: account.id,
      profileId: profile.id,
      displayName: account.displayName,
      specialty: profile.medicalSpecialty.name as Specialty,
      specialtyId: profile.specialtyId,
      role: account.role,
      workingDays: profile.workingHoursDays.map((day) => ({
        dayOfWeek: day.dayOfWeek,
        isWorkingDay: day.isWorkingDay,
        startTime: day.startTime,
        endTime: day.endTime,
        breaks: (day.breaks as { start: string; end: string }[] | null) ?? [],
        pricingType: day.pricingType,
        feeAmount: day.feeAmount === null ? null : Number(day.feeAmount),
        feeCurrency: day.feeCurrency,
      })),
      bufferMinutes: profile.bufferMinutesOverride ?? 5,
      verificationCaseIds: account.verificationCases.map((c) => ({ id: c.id, status: c.status, submittedAt: c.submittedAt })),
      hospitalId: profile.hospitalId,
    });
  }

  const patientAccounts = await prisma.account.findMany({
    where: { email: { in: DEMO_PATIENT_EMAILS } },
    include: {
      patientProfile: { include: { healthGraph: true } },
      verificationCases: { orderBy: { submittedAt: 'asc' } },
    },
  });
  const patients = new Map<string, DemoPatientRecord>();
  for (const email of DEMO_PATIENT_EMAILS) {
    const account = patientAccounts.find((row) => row.email === email);
    const profile = account?.patientProfile;
    if (!account || !profile) {
      missing.push(email);
      continue;
    }
    patients.set(keyOf(email), {
      key: keyOf(email),
      email,
      accountId: account.id,
      profileId: profile.id,
      displayName: account.displayName,
      firstName: account.displayName.split(' ')[0],
      gender: account.gender === 'female' ? 'female' : 'male',
      dateOfBirth: account.dateOfBirth,
      allergies: profile.allergies,
      bloodType: profile.bloodType,
      insuranceProviderId: profile.insuranceProviderId,
      healthGraphId: profile.healthGraph?.id ?? null,
      verificationCases: account.verificationCases.map((c) => ({ id: c.id, status: c.status, submittedAt: c.submittedAt })),
    });
  }

  const admin = await prisma.account.findUnique({ where: { email: DEMO_ADMIN_EMAIL } });
  if (!admin) {
    throw new Error(`Demo super admin "${DEMO_ADMIN_EMAIL}" not found -- run the identity seed first (npm run seed).`);
  }
  const hospitalAdmin = await prisma.account.findUnique({ where: { email: DEMO_HOSPITAL_ADMIN_EMAIL } });

  return { doctors, patients, adminAccountId: admin.id, hospitalAdminAccountId: hospitalAdmin?.id ?? null, missing };
}
