import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConsultationDomainError } from '../exceptions/consultation-domain.error.js';

import { FollowUpRecommendation } from './follow-up-recommendation.entity.js';

const PROPS = {
  consultationSessionId: '11111111-1111-4111-8111-111111111111',
  authoringDoctorId: '22222222-2222-4222-8222-222222222222',
  reason: 'Re-check blood pressure in two weeks.',
};

describe('FollowUpRecommendation', () => {
  it('records a recommendation with a reason', () => {
    const recommendation = FollowUpRecommendation.recommend(PROPS);
    assert.equal(recommendation.getReason(), PROPS.reason);
    assert.equal(recommendation.getConsultationSessionId(), PROPS.consultationSessionId);
    assert.equal(recommendation.getAuthoringDoctorId(), PROPS.authoringDoctorId);
    assert.equal(recommendation.getRecommendedDate(), undefined);
  });

  it('stores an optional recommended date', () => {
    const recommendedDate = new Date('2026-08-01T00:00:00.000Z');
    const recommendation = FollowUpRecommendation.recommend({ ...PROPS, recommendedDate });
    assert.equal(recommendation.getRecommendedDate()?.toISOString(), recommendedDate.toISOString());
  });

  it('trims the reason', () => {
    const recommendation = FollowUpRecommendation.recommend({ ...PROPS, reason: '  Follow up soon.  ' });
    assert.equal(recommendation.getReason(), 'Follow up soon.');
  });

  it('rejects an empty reason', () => {
    assert.throws(() => FollowUpRecommendation.recommend({ ...PROPS, reason: '' }), ConsultationDomainError);
  });

  it('rejects a whitespace-only reason', () => {
    assert.throws(() => FollowUpRecommendation.recommend({ ...PROPS, reason: '   ' }), ConsultationDomainError);
  });
});
