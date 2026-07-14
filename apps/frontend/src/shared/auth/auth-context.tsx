'use client';

import { createContext, useContext } from 'react';
import type { AuthState } from '@/shared/auth/types';

/**
 * The context and hook only — generic, backend-agnostic, safe for any
 * feature to import (per Section 1.6: shared/ must never depend on
 * features/). The actual provider that populates this context
 * (`features/auth/providers/session-provider.tsx`) lives in the auth
 * feature module, since it calls `authApi` — a feature dependency shared/
 * itself must not have. `app/[locale]/layout.tsx` (routing, which is
 * allowed to depend on both shared/ and features/) is what wires the two
 * together.
 */
export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within a SessionProvider.');
  }
  return context;
}
