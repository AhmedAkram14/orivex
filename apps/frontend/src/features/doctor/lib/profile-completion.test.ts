import { describe, expect, it } from 'vitest';
import type { DoctorProfile } from '@/features/doctor/api/types';
import { computeProfileCompletion } from './profile-completion';

function buildProfile(overrides: Partial<DoctorProfile> = {}): DoctorProfile {
  return {
    id: 'doctor-profile-1',
    accountId: 'user-doctor-1',
    fullName: 'Dr. Sarah Ahmed',
    email: 'doctor@orivex.dev',
    licenseNumber: 'LIC-2010-4471',
    specialtyId: 'specialty-cardiology',
    languages: [],
    insuranceProviders: [],
    publications: [],
    awards: [],
    workExperience: [],
    createdAt: '2020-01-15T00:00:00.000Z',
    updatedAt: '2020-01-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('computeProfileCompletion', () => {
  it('is 0% when none of the seven real fields are on record', () => {
    const { percent, missingFields } = computeProfileCompletion(buildProfile());
    expect(percent).toBe(0);
    expect(missingFields).toHaveLength(7);
  });

  it('is 100% when every real field is on record, counting publications/awards/workExperience as one "portfolio" check', () => {
    const result = computeProfileCompletion(
      buildProfile({
        biography: 'Cardiologist with a focus on preventive care.',
        yearsOfExperience: 12,
        languages: ['en'],
        consultationFeeAmount: 450,
        insuranceProviders: ['Misr Insurance'],
        licenseExpiryDate: '2030-01-01T00:00:00.000Z',
        awards: [{ id: 'award-1', title: 'Excellence in Patient Care' }],
      }),
    );
    expect(result.percent).toBe(100);
    expect(result.missingFields).toHaveLength(0);
  });

  it('only lists fields that are genuinely empty, never a fixed static list', () => {
    const { missingFields } = computeProfileCompletion(
      buildProfile({
        biography: 'Bio.',
        yearsOfExperience: 5,
        languages: ['en'],
      }),
    );
    expect(missingFields).toEqual(['consultationFeeAmount', 'portfolio', 'insuranceProviders', 'licenseExpiryDate']);
  });

  it('treats a whitespace-only biography as not on record', () => {
    const { missingFields } = computeProfileCompletion(buildProfile({ biography: '   ' }));
    expect(missingFields).toContain('biography');
  });

  it('treats a work-experience-only portfolio as satisfying the portfolio check', () => {
    const { missingFields } = computeProfileCompletion(
      buildProfile({
        workExperience: [
          { id: 'work-1', organizationName: 'Cairo University Hospitals', position: 'Consultant', startDate: '2021-01-01T00:00:00.000Z' },
        ],
      }),
    );
    expect(missingFields).not.toContain('portfolio');
  });
});
