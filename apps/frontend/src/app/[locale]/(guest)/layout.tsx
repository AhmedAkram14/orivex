'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/shared/auth/auth-context';
import { useRouter } from '@/shared/i18n/navigation';
import { LoadingState } from '@/shared/ui/loading-state';

/**
 * Guest Routes — login, register, forgot/reset password, verify/check
 * email. An already-authenticated visitor lands on `/` instead, matching
 * the same "UX convenience, not a security boundary" rule every other
 * guard in this codebase follows: nothing behind this redirect is
 * sensitive, it's purely about not showing a login form to someone
 * already logged in.
 */
export default function GuestLayout({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/');
    }
  }, [status, router]);

  if (status === 'authenticated') {
    return <LoadingState />;
  }

  return children;
}
