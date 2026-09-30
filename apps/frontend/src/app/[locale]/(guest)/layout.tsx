'use client';

import { useEffect, type ReactNode } from 'react';
import { safeReturnTo } from '@/shared/auth/return-to';
import { useAuth } from '@/shared/auth/auth-context';
import { useRouter } from '@/shared/i18n/navigation';
import { AppLoadingScreen } from '@/shared/ui/app-loading-screen';

/**
 * Guest Routes — login, register, forgot/reset password, verify/check
 * email. An already-authenticated visitor lands on `/dashboard` instead
 * (Phase 6's application shell), matching the same "UX convenience, not a
 * security boundary" rule every other guard in this codebase follows:
 * nothing behind this redirect is sensitive, it's purely about not
 * showing a login form to someone already logged in.
 */
export default function GuestLayout({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (status === 'authenticated') {
      // Signing in flips the session to authenticated while still on /login -- honor the same safe
      // ?returnTo= the login form does, or this redirect would win and drop the visitor on /dashboard.
      const returnPath = safeReturnTo(new URLSearchParams(window.location.search).get('returnTo'));
      router.replace(returnPath ?? '/dashboard');
    }
  }, [status, router]);

  if (status === 'authenticated') {
    return <AppLoadingScreen />;
  }

  return children;
}
