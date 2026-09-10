import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ClinicalDomainError } from '../exceptions/clinical-domain.error.js';

import { ClinicalNote } from './clinical-note.entity.js';

const SOAP = { subjective: 'Reports headache', objective: 'BP 120/80', assessment: 'Tension headache', plan: 'OTC analgesic' };

describe('ClinicalNote', () => {
  it('authors a note, deriving content from the four SOAP fields', () => {
    const note = ClinicalNote.author({
      consultationSessionId: '11111111-1111-4111-8111-111111111111',
      authoringDoctorId: '22222222-2222-4222-8222-222222222222',
      ...SOAP,
    });

    assert.match(note.getContent(), /Reports headache/);
    assert.equal(note.getSubjective(), 'Reports headache');
    assert.equal(note.getObjective(), 'BP 120/80');
    assert.equal(note.getAssessment(), 'Tension headache');
    assert.equal(note.getPlan(), 'OTC analgesic');
    assert.equal(note.getAddendumOfNoteId(), undefined);
  });

  it('rejects an empty SOAP field', () => {
    assert.throws(
      () =>
        ClinicalNote.author({
          consultationSessionId: '11111111-1111-4111-8111-111111111111',
          authoringDoctorId: '22222222-2222-4222-8222-222222222222',
          ...SOAP,
          plan: '   ',
        }),
      ClinicalDomainError,
    );
  });

  it('authors an addendum referencing the original note', () => {
    const original = ClinicalNote.author({
      consultationSessionId: '11111111-1111-4111-8111-111111111111',
      authoringDoctorId: '22222222-2222-4222-8222-222222222222',
      ...SOAP,
    });
    const addendum = ClinicalNote.author({
      consultationSessionId: '11111111-1111-4111-8111-111111111111',
      authoringDoctorId: '22222222-2222-4222-8222-222222222222',
      ...SOAP,
      plan: 'Follow up in 1 week',
      addendumOfNoteId: original.getId(),
    });

    assert.equal(addendum.getAddendumOfNoteId(), original.getId());
  });
});
