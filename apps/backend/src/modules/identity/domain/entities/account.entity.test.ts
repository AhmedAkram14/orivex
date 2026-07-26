import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AccountRole } from '../enums/account-role.enum.js';
import { Gender } from '../enums/gender.enum.js';
import { IdentityDomainError } from '../exceptions/identity-domain.error.js';
import { DisplayName } from '../value-objects/display-name.value-object.js';
import { EmailAddress } from '../value-objects/email-address.value-object.js';

import { Account } from './account.entity.js';

function buildAccount(): Account {
  return Account.register({
    email: EmailAddress.create('ada@example.com'),
    role: AccountRole.Patient,
    displayName: DisplayName.create('Ada Lovelace'),
  });
}

describe('Account.updatePersonalProfile', () => {
  it('updates dateOfBirth/gender/nationalityId/address on the underlying UserProfile', () => {
    const account = buildAccount();

    account.updatePersonalProfile({
      dateOfBirth: new Date('1990-01-01'),
      gender: Gender.Other,
      nationalityId: '11111111-1111-4111-8111-111111111111',
      address: '1 Nile Corniche',
    });

    const profile = account.getUserProfile();
    assert.ok(profile.getDateOfBirth());
    assert.equal(profile.getGender(), Gender.Other);
    assert.equal(profile.getNationalityId(), '11111111-1111-4111-8111-111111111111');
    assert.equal(profile.getAddress(), '1 Nile Corniche');
  });

  it('rejects a date of birth in the future', () => {
    const account = buildAccount();
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);

    assert.throws(() => account.updatePersonalProfile({ dateOfBirth: future }), IdentityDomainError);
  });

  it('leaves a field untouched when its prop is undefined (not explicitly cleared)', () => {
    const account = buildAccount();
    account.updatePersonalProfile({ address: 'Some address' });

    account.updatePersonalProfile({ dateOfBirth: new Date('1985-05-05') });

    assert.equal(account.getUserProfile().getAddress(), 'Some address');
  });

  it('clears a field when its prop is explicitly null', () => {
    const account = buildAccount();
    account.updatePersonalProfile({ address: 'Some address' });

    account.updatePersonalProfile({ address: null });

    assert.equal(account.getUserProfile().getAddress(), undefined);
  });
});
