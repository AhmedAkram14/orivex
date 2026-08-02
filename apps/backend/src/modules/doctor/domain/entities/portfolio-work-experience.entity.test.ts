import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DoctorDomainError } from '../exceptions/doctor-domain.error.js';

import { PortfolioWorkExperience } from './portfolio-work-experience.entity.js';

describe('PortfolioWorkExperience', () => {
  it('creates a work experience entry with a generated id', () => {
    const startDate = new Date('2021-01-01');
    const entry = PortfolioWorkExperience.create({
      organizationName: 'Cairo Medical Center',
      position: 'Consultant Orthopedic Surgeon',
      startDate,
      description: 'Led the orthopedic surgery department.',
    });

    assert.ok(entry.getId());
    assert.equal(entry.getOrganizationName(), 'Cairo Medical Center');
    assert.equal(entry.getPosition(), 'Consultant Orthopedic Surgeon');
    assert.deepEqual(entry.getStartDate(), startDate);
    assert.equal(entry.getEndDate(), undefined);
    assert.equal(entry.getDescription(), 'Led the orthopedic surgery department.');
  });

  it('leaves endDate undefined for an ongoing ("present") position', () => {
    const entry = PortfolioWorkExperience.create({
      organizationName: 'Cairo Medical Center',
      position: 'Consultant',
      startDate: new Date('2021-01-01'),
    });

    assert.equal(entry.getEndDate(), undefined);
  });

  it('trims organizationName and position', () => {
    const entry = PortfolioWorkExperience.create({
      organizationName: '  Cairo Medical Center  ',
      position: '  Consultant  ',
      startDate: new Date('2021-01-01'),
    });

    assert.equal(entry.getOrganizationName(), 'Cairo Medical Center');
    assert.equal(entry.getPosition(), 'Consultant');
  });

  it('rejects an empty organizationName', () => {
    assert.throws(
      () =>
        PortfolioWorkExperience.create({
          organizationName: '   ',
          position: 'Consultant',
          startDate: new Date('2021-01-01'),
        }),
      DoctorDomainError,
    );
  });

  it('rejects an empty position', () => {
    assert.throws(
      () =>
        PortfolioWorkExperience.create({
          organizationName: 'Cairo Medical Center',
          position: '',
          startDate: new Date('2021-01-01'),
        }),
      DoctorDomainError,
    );
  });

  it('rejects an endDate before startDate', () => {
    assert.throws(
      () =>
        PortfolioWorkExperience.create({
          organizationName: 'Cairo Medical Center',
          position: 'Consultant',
          startDate: new Date('2021-01-01'),
          endDate: new Date('2020-01-01'),
        }),
      DoctorDomainError,
    );
  });

  it('reconstitutes with a pre-existing id', () => {
    const entry = PortfolioWorkExperience.reconstitute({
      id: '11111111-1111-4111-8111-111111111111',
      organizationName: 'Cairo Medical Center',
      position: 'Consultant',
      startDate: new Date('2021-01-01'),
      endDate: new Date('2023-01-01'),
      description: undefined,
    });

    assert.equal(entry.getId(), '11111111-1111-4111-8111-111111111111');
    assert.deepEqual(entry.getEndDate(), new Date('2023-01-01'));
  });
});
