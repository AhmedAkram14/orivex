import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthContext } from './auth-context';
import { PermissionGuard } from './permission-guard';
import type { AuthState } from './types';

function renderWithAuth(state: AuthState, ui: React.ReactElement) {
  return render(<AuthContext.Provider value={state}>{ui}</AuthContext.Provider>);
}

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

describe('PermissionGuard', () => {
  it('renders children when the user has the required permission', () => {
    renderWithAuth(
      doctorState,
      <PermissionGuard permission="prescriptions:write">
        <span>Prescribe</span>
      </PermissionGuard>,
    );
    expect(screen.getByText('Prescribe')).toBeInTheDocument();
  });

  it('renders the fallback when the user lacks the permission', () => {
    renderWithAuth(
      doctorState,
      <PermissionGuard permission="admin:manage-hospital" fallback={<span>No access</span>}>
        <span>Manage hospital</span>
      </PermissionGuard>,
    );
    expect(screen.getByText('No access')).toBeInTheDocument();
    expect(screen.queryByText('Manage hospital')).not.toBeInTheDocument();
  });
});
