'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { AuthState } from '@/shared/auth/types';

/**
 * The backend has no authentication layer wired yet (Phase 4, 🔒 blocked
 * on Keycloak integration — see docs/roadmaps/frontend-master-plan.md).
 * Every session this provider produces today is genuinely unauthenticated
 * — not a placeholder "logged in as Dr. X" fake, which
 * docs/13-engineering-bootstrap.md explicitly warns is "a classic source
 * of works-in-dev, breaks-in-staging auth bugs." When Keycloak exists,
 * this file (not shared/lib/api/client.ts, not any consumer of useAuth())
 * is what changes: it starts actually calling Keycloak, populating real
 * AuthenticatedUser data, and calling __setAuthHeaderProvider with a real
 * token getter.
 */
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthState>(() => ({ status: 'unauthenticated', user: null }), []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}
