import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RequireRole } from './require-role';
import { AuthProvider } from './auth-provider';

describe('RequireRole', () => {
  it('renders the fallback (not children) since no real session exists yet', () => {
    render(
      <AuthProvider>
        <RequireRole roles={['doctor']} fallback={<span>Not allowed</span>}>
          <span>Doctor-only content</span>
        </RequireRole>
      </AuthProvider>,
    );

    expect(screen.getByText('Not allowed')).toBeInTheDocument();
    expect(screen.queryByText('Doctor-only content')).not.toBeInTheDocument();
  });
});
