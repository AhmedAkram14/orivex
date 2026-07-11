import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HealthGraphNodeType } from '../enums/health-graph-node-type.enum.js';
import { CertaintyLevel } from '../enums/certainty-level.enum.js';
import { ClinicalDomainError } from '../exceptions/clinical-domain.error.js';

import { HealthGraph } from './health-graph.entity.js';

describe('HealthGraph', () => {
  it('creates empty for a patient', () => {
    const graph = HealthGraph.create('11111111-1111-4111-8111-111111111111');
    assert.equal(graph.getPatientId(), '11111111-1111-4111-8111-111111111111');
    assert.deepEqual(graph.getNodes(), []);
  });

  it('adds a node and records HealthGraphUpdated', () => {
    const graph = HealthGraph.create('11111111-1111-4111-8111-111111111111');

    const node = graph.addNode({
      nodeType: HealthGraphNodeType.Condition,
      freeTextDescription: 'Hypertension',
      certaintyLevel: CertaintyLevel.Confirmed,
      authoringDoctorId: '22222222-2222-4222-8222-222222222222',
    });

    assert.equal(graph.getNodes().length, 1);
    assert.equal(graph.findNode(node.getId())?.getFreeTextDescription(), 'Hypertension');
    assert.equal(graph.releaseDomainEvents().length, 1);
  });

  it('requires authoringDoctorId for a clinically-sourced node', () => {
    const graph = HealthGraph.create('11111111-1111-4111-8111-111111111111');

    assert.throws(
      () => graph.addNode({ nodeType: HealthGraphNodeType.Condition, freeTextDescription: 'Hypertension' }),
      ClinicalDomainError,
    );
  });
});
