import { describe, expect, it } from 'vitest';
import { getPermissionsForRoles, hasPermission } from './permissions';

describe('permissions', () => {
  it('grants a doctor clinical permissions but not admin ones', () => {
    expect(hasPermission(['doctor'], 'prescriptions:write')).toBe(true);
    expect(hasPermission(['doctor'], 'admin:manage-hospital')).toBe(false);
  });

  it('grants a super_admin every permission', () => {
    const all = getPermissionsForRoles(['super_admin']);
    expect(all).toContain('admin:manage-hospital');
    expect(all).toContain('prescriptions:write');
    expect(all).toContain('billing:read');
  });

  it('unions permissions across multiple roles without duplicates', () => {
    const permissions = getPermissionsForRoles(['nurse', 'receptionist']);
    expect(permissions.filter((p) => p === 'patients:read')).toHaveLength(1);
    expect(permissions).toContain('clinical-notes:write');
    expect(permissions).toContain('appointments:write');
  });

  it('grants a patient no write permissions', () => {
    expect(hasPermission(['patient'], 'appointments:write')).toBe(false);
    expect(hasPermission(['patient'], 'appointments:read')).toBe(true);
  });
});
