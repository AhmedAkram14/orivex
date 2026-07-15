import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { WeakPasswordError } from '../exceptions/weak-password.error.js';

import { PlainPassword } from './plain-password.value-object.js';

describe('PlainPassword', () => {
  it('accepts a password meeting length and complexity requirements', () => {
    const password = PlainPassword.create('Str0ngPassword');
    assert.equal(password.toString(), 'Str0ngPassword');
  });

  it('rejects a password shorter than the minimum length', () => {
    assert.throws(() => PlainPassword.create('Sh0rt'), WeakPasswordError);
  });

  it('rejects a password with no uppercase letter', () => {
    assert.throws(() => PlainPassword.create('lowercase123'), WeakPasswordError);
  });

  it('rejects a password with no digit', () => {
    assert.throws(() => PlainPassword.create('NoDigitsHere'), WeakPasswordError);
  });
});
