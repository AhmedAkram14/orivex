import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toDomainDoctorProfile, type PersistedDoctorProfileRow } from './doctor-profile.mapper.js';

const SPECIALTY_ID = '11111111-1111-4111-8111-111111111111';

function buildRow(overrides: Partial<PersistedDoctorProfileRow> = {}): PersistedDoctorProfileRow {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    accountId: '33333333-3333-4333-8333-333333333333',
    licenseNumber: 'LIC-1',
    biography: null,
    yearsOfExperience: null,
    languages: [],
    insuranceProviders: [],
    consultationFeeAmount: null,
    hospitalId: null,
    specialtyId: SPECIALTY_ID,
    professionalRank: null,
    licenseExpiryDate: null,
    departmentId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    publications: [],
    awards: [],
    workExperience: [],
    ...overrides,
  } as PersistedDoctorProfileRow;
}

describe('toDomainDoctorProfile', () => {
  it('round-trips insuranceProviders as a plain string list, same as languages', () => {
    const row = buildRow({ insuranceProviders: ['Misr Insurance', 'AXA', 'Allianz'] });

    const profile = toDomainDoctorProfile(row);

    assert.deepEqual(profile.getInsuranceProviders(), ['Misr Insurance', 'AXA', 'Allianz']);
  });

  it('round-trips workExperience entries, including an ongoing ("present") position', () => {
    const row = buildRow({
      workExperience: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          doctorProfileId: '22222222-2222-4222-8222-222222222222',
          organizationName: 'Cairo Medical Center',
          position: 'Consultant Orthopedic Surgeon',
          professionalRank: 'consultant',
          startDate: new Date('2021-01-01'),
          endDate: null,
          description: 'Led the orthopedic surgery department.',
          createdAt: new Date('2026-01-01'),
        },
      ],
    });

    const profile = toDomainDoctorProfile(row);
    const [entry] = profile.getWorkExperience();

    assert.equal(profile.getWorkExperience().length, 1);
    assert.equal(entry.getOrganizationName(), 'Cairo Medical Center');
    assert.equal(entry.getPosition(), 'Consultant Orthopedic Surgeon');
    assert.equal(entry.getProfessionalRank(), 'consultant');
    assert.deepEqual(entry.getStartDate(), new Date('2021-01-01'));
    assert.equal(entry.getEndDate(), undefined);
    assert.equal(entry.getDescription(), 'Led the orthopedic surgery department.');
  });

  it('defaults insuranceProviders/workExperience to empty when the row has none', () => {
    const profile = toDomainDoctorProfile(buildRow());

    assert.deepEqual(profile.getInsuranceProviders(), []);
    assert.deepEqual(profile.getWorkExperience(), []);
  });
});
