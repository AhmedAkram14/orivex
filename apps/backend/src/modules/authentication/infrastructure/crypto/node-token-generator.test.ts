import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NodeTokenGenerator } from './node-token-generator.js';

describe('NodeTokenGenerator', () => {
  it('generates distinct, non-trivial opaque tokens', () => {
    const generator = new NodeTokenGenerator();

    const a = generator.generate();
    const b = generator.generate();

    assert.notEqual(a, b);
    assert.ok(a.length >= 32);
  });

  it('hash is deterministic for the same input and differs for different input', () => {
    const generator = new NodeTokenGenerator();

    const hashA1 = generator.hash('token-value');
    const hashA2 = generator.hash('token-value');
    const hashB = generator.hash('different-token-value');

    assert.equal(hashA1, hashA2);
    assert.notEqual(hashA1, hashB);
  });

  it('never returns the plain value as its own hash', () => {
    const generator = new NodeTokenGenerator();
    const plain = generator.generate();

    assert.notEqual(generator.hash(plain), plain);
  });
});
