import { describe, expect, it } from 'vitest';
import type { PatientProfile } from '@/features/patient/api/types';
import { getOptionalProfileGaps, isPatientProfileComplete } from './profile-completeness';

const base = { id: 'p1', fullName: 'A', email: 'a@x.dev', emergencyContacts: [] } as PatientProfile;

describe('isPatientProfileComplete', () => {
  it('needs only date of birth, gender and phone', () => {
    expect(isPatientProfileComplete({ ...base, dateOfBirth: '1990-01-01', gender: 'female', phoneNumber: '+20 100 000 0000' })).toBe(true);
  });

  it('is incomplete when any of the three is missing, whatever else is filled in', () => {
    const rest = { bloodType: 'A+', allergies: 'x', chronicDiseases: 'y', nationalityId: 'n', address: 'a' } as const;
    expect(isPatientProfileComplete({ ...base, ...rest, gender: 'female', phoneNumber: '1' })).toBe(false);
    expect(isPatientProfileComplete({ ...base, ...rest, dateOfBirth: '1990-01-01', phoneNumber: '1' })).toBe(false);
    expect(isPatientProfileComplete({ ...base, ...rest, dateOfBirth: '1990-01-01', gender: 'female' })).toBe(false);
  });
});

describe('getOptionalProfileGaps', () => {
  it('lists every optional field for a bare profile and none for a full one', () => {
    expect(getOptionalProfileGaps(base)).toHaveLength(7);
    const full = {
      ...base,
      nationalityId: 'n',
      address: 'a',
      bloodType: 'A+',
      allergies: 'x',
      chronicDiseases: 'y',
      insuranceProviderId: 'i',
      emergencyContacts: [{ id: '1', name: 'M', relationship: 'sibling', phoneNumber: '1' }],
    } as PatientProfile;
    expect(getOptionalProfileGaps(full)).toEqual([]);
  });
});
