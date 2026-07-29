import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConsultationDomainError } from '../exceptions/consultation-domain.error.js';

import { ConsultationFeedback } from './consultation-feedback.entity.js';

const PROPS = {
  consultationSessionId: '11111111-1111-4111-8111-111111111111',
  patientId: '22222222-2222-4222-8222-222222222222',
  doctorId: '33333333-3333-4333-8333-333333333333',
  rating: 5,
};

describe('ConsultationFeedback', () => {
  it('submits with a valid rating and records ConsultationFeedbackSubmittedEvent', () => {
    const feedback = ConsultationFeedback.submit(PROPS);

    assert.equal(feedback.getRating(), 5);
    assert.equal(feedback.getConsultationSessionId(), PROPS.consultationSessionId);
    assert.equal(feedback.getPatientId(), PROPS.patientId);
    assert.equal(feedback.getDoctorId(), PROPS.doctorId);
    const events = feedback.releaseDomainEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0]?.eventName, 'consultation.feedback.submitted');
  });

  it('trims and stores an optional comment', () => {
    const feedback = ConsultationFeedback.submit({ ...PROPS, comment: '  Great doctor!  ' });
    assert.equal(feedback.getComment(), 'Great doctor!');
  });

  it('stores no comment when omitted', () => {
    const feedback = ConsultationFeedback.submit(PROPS);
    assert.equal(feedback.getComment(), undefined);
  });

  it('treats a blank comment as no comment', () => {
    const feedback = ConsultationFeedback.submit({ ...PROPS, comment: '   ' });
    assert.equal(feedback.getComment(), undefined);
  });

  for (const rating of [0, 6, -1, 1.5]) {
    it(`rejects an out-of-range rating (${rating})`, () => {
      assert.throws(() => ConsultationFeedback.submit({ ...PROPS, rating }), ConsultationDomainError);
    });
  }

  for (const rating of [1, 2, 3, 4, 5]) {
    it(`accepts a valid rating (${rating})`, () => {
      assert.doesNotThrow(() => ConsultationFeedback.submit({ ...PROPS, rating }));
    });
  }

  it('update() changes the rating and comment in place, without touching id/consultationSessionId/patientId/doctorId', () => {
    const feedback = ConsultationFeedback.submit({ ...PROPS, comment: 'Original comment' });
    const originalId = feedback.getId();

    feedback.update(2, 'Revised after a follow-up visit.');

    assert.equal(feedback.getRating(), 2);
    assert.equal(feedback.getComment(), 'Revised after a follow-up visit.');
    assert.equal(feedback.getId(), originalId);
    assert.equal(feedback.getConsultationSessionId(), PROPS.consultationSessionId);
    assert.equal(feedback.getPatientId(), PROPS.patientId);
    assert.equal(feedback.getDoctorId(), PROPS.doctorId);
  });

  it('update() trims and clears the comment the same way submit() does', () => {
    const feedback = ConsultationFeedback.submit(PROPS);
    feedback.update(3, '   ');
    assert.equal(feedback.getComment(), undefined);
  });

  for (const rating of [0, 6, -1, 1.5]) {
    it(`update() rejects an out-of-range rating (${rating})`, () => {
      const feedback = ConsultationFeedback.submit(PROPS);
      assert.throws(() => feedback.update(rating), ConsultationDomainError);
    });
  }

  it('reconstitutes without raising a domain event', () => {
    const feedback = ConsultationFeedback.reconstitute({
      id: '44444444-4444-4444-8444-444444444444',
      ...PROPS,
      createdAt: new Date(),
    });
    assert.equal(feedback.releaseDomainEvents().length, 0);
  });
});
