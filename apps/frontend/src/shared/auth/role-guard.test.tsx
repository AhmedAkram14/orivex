import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthContext } from './auth-context';
import { RoleGuard } from './role-guard';
import type { AuthState } from './types';

function renderWithAuth(state: AuthState, ui: React.ReactElement) {
  return render(<AuthContext.Provider value={state}>{ui}</AuthContext.Provider>);
}

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

describe('RoleGuard', () => {
  it('renders children when the user has one of the listed roles', () => {
    renderWithAuth(
      doctorState,
      <RoleGuard roles={['doctor', 'nurse']}>
        <span>Doctor-only content</span>
      </RoleGuard>,
    );
    expect(screen.getByText('Doctor-only content')).toBeInTheDocument();
  });

  it('renders the fallback when the user lacks every listed role', () => {
    renderWithAuth(
      doctorState,
      <RoleGuard roles={['super_admin']} fallback={<span>Not allowed</span>}>
        <span>Admin-only content</span>
      </RoleGuard>,
    );
    expect(screen.getByText('Not allowed')).toBeInTheDocument();
    expect(screen.queryByText('Admin-only content')).not.toBeInTheDocument();
  });

  it('renders nothing (no fallback) when there is no user at all', () => {
    renderWithAuth(
      { status: 'unauthenticated', user: null },
      <RoleGuard roles={['doctor']}>
        <span>Doctor-only content</span>
      </RoleGuard>,
    );
    expect(screen.queryByText('Doctor-only content')).not.toBeInTheDocument();
  });
});
