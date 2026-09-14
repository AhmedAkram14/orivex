import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ClinicalDomainError } from '../exceptions/clinical-domain.error.js';
import { VitalReadingSource } from '../enums/vital-reading-source.enum.js';
import { VitalType } from '../enums/vital-type.enum.js';

import { VitalReading } from './vital-reading.entity.js';

const PATIENT_ID = '11111111-1111-4111-8111-111111111111';

describe('VitalReading.ingestFromDevice', () => {
  it('creates a Device-sourced reading with no doctor/session authorship', () => {
    const reading = VitalReading.ingestFromDevice({
      patientId: PATIENT_ID,
      type: VitalType.Weight,
      value: 72,
      recordedAt: new Date('2026-09-01T08:00:00.000Z'),
      sourceProvider: 'apple-health',
      externalObservationId: 'obs-1',
    });

    assert.equal(reading.getSource(), VitalReadingSource.Device);
    assert.equal(reading.getSourceProvider(), 'apple-health');
    assert.equal(reading.getExternalObservationId(), 'obs-1');
    assert.equal(reading.getRecordedByDoctorId(), undefined);
    assert.equal(reading.getConsultationSessionId(), undefined);
  });

  it('rejects a non-positive value', () => {
    assert.throws(
      () =>
        VitalReading.ingestFromDevice({
          patientId: PATIENT_ID,
          type: VitalType.Weight,
          value: 0,
          recordedAt: new Date(),
          sourceProvider: 'apple-health',
          externalObservationId: 'obs-1',
        }),
      ClinicalDomainError,
    );
  });

  it('requires a diastolic value for blood pressure readings', () => {
    assert.throws(
      () =>
        VitalReading.ingestFromDevice({
          patientId: PATIENT_ID,
          type: VitalType.BloodPressure,
          value: 120,
          recordedAt: new Date(),
          sourceProvider: 'apple-health',
          externalObservationId: 'obs-1',
        }),
      ClinicalDomainError,
    );
  });

  it('rejects a blank source provider', () => {
    assert.throws(
      () =>
        VitalReading.ingestFromDevice({
          patientId: PATIENT_ID,
          type: VitalType.Weight,
          value: 72,
          recordedAt: new Date(),
          sourceProvider: '   ',
          externalObservationId: 'obs-1',
        }),
      ClinicalDomainError,
    );
  });

  it('rejects a blank external observation id', () => {
    assert.throws(
      () =>
        VitalReading.ingestFromDevice({
          patientId: PATIENT_ID,
          type: VitalType.Weight,
          value: 72,
          recordedAt: new Date(),
          sourceProvider: 'apple-health',
          externalObservationId: '',
        }),
      ClinicalDomainError,
    );
  });
});

describe('VitalReading.create', () => {
  it('still defaults to Clinical source (regression: K10 must not change the existing write path)', () => {
    const reading = VitalReading.create({ patientId: PATIENT_ID, type: VitalType.Weight, value: 70 });

    assert.equal(reading.getSource(), VitalReadingSource.Clinical);
    assert.equal(reading.getSourceProvider(), undefined);
    assert.equal(reading.getExternalObservationId(), undefined);
  });
});
