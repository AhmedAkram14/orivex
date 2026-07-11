import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ClinicalDomainError } from '../exceptions/clinical-domain.error.js';

import { ClinicalNote } from './clinical-note.entity.js';

describe('ClinicalNote', () => {
  it('authors a note', () => {
    const note = ClinicalNote.author({
      consultationSessionId: '11111111-1111-4111-8111-111111111111',
      authoringDoctorId: '22222222-2222-4222-8222-222222222222',
      content: 'SOAP note content',
    });

    assert.equal(note.getContent(), 'SOAP note content');
    assert.equal(note.getAddendumOfNoteId(), undefined);
  });

  it('rejects empty content', () => {
    assert.throws(
      () =>
        ClinicalNote.author({
          consultationSessionId: '11111111-1111-4111-8111-111111111111',
          authoringDoctorId: '22222222-2222-4222-8222-222222222222',
          content: '   ',
        }),
      ClinicalDomainError,
    );
  });

  it('authors an addendum referencing the original note', () => {
    const original = ClinicalNote.author({
      consultationSessionId: '11111111-1111-4111-8111-111111111111',
      authoringDoctorId: '22222222-2222-4222-8222-222222222222',
      content: 'Original note',
    });
    const addendum = ClinicalNote.author({
      consultationSessionId: '11111111-1111-4111-8111-111111111111',
      authoringDoctorId: '22222222-2222-4222-8222-222222222222',
      content: 'Correction',
      addendumOfNoteId: original.getId(),
    });

    assert.equal(addendum.getAddendumOfNoteId(), original.getId());
  });
});
