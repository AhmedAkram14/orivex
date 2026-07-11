import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { JourneyStage } from '../enums/journey-stage.enum.js';
import { ClinicalDomainError } from '../exceptions/clinical-domain.error.js';

import { HealthJourney } from './health-journey.entity.js';

describe('HealthJourney', () => {
  it('starts in Diagnosis', () => {
    const journey = HealthJourney.start('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222');
    assert.equal(journey.getStage(), JourneyStage.Diagnosis);
    assert.equal(journey.releaseDomainEvents().length, 1);
  });

  it('advances forward through the documented sequence', () => {
    const journey = HealthJourney.start('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222');
    journey.advanceStage(JourneyStage.FollowUp);
    journey.advanceStage(JourneyStage.Monitoring);
    journey.advanceStage(JourneyStage.Resolved);
    assert.equal(journey.getStage(), JourneyStage.Resolved);
  });

  it('allows ReferredOut as an exceptional branch from any non-terminal stage', () => {
    const journey = HealthJourney.start('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222');
    journey.advanceStage(JourneyStage.ReferredOut);
    assert.equal(journey.getStage(), JourneyStage.ReferredOut);
  });

  it('rejects skipping stages', () => {
    const journey = HealthJourney.start('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222');
    assert.throws(() => journey.advanceStage(JourneyStage.Monitoring), ClinicalDomainError);
  });

  it('rejects transitioning out of a terminal stage', () => {
    const journey = HealthJourney.start('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222');
    journey.advanceStage(JourneyStage.ReferredOut);
    assert.throws(() => journey.advanceStage(JourneyStage.FollowUp), ClinicalDomainError);
  });

  it('links a node id once, idempotently', () => {
    const journey = HealthJourney.start('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222');
    journey.linkNode('33333333-3333-4333-8333-333333333333');
    journey.linkNode('33333333-3333-4333-8333-333333333333');
    assert.deepEqual(journey.getLinkedNodeIds(), ['33333333-3333-4333-8333-333333333333']);
  });
});
