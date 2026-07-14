'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { AUTH_ERROR_CODES } from '@/features/auth/api/types';
import { useVerifyEmail } from '@/features/auth/hooks/use-verify-email';
import { Link } from '@/shared/i18n/navigation';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { LoadingState } from '@/shared/ui/loading-state';

export interface VerifyEmailStatusProps {
  token: string;
}

export function VerifyEmailStatus({ token }: VerifyEmailStatusProps) {
  const t = useTranslations('auth.verifyEmail');
  const verifyEmail = useVerifyEmail();
  const { mutate: verify } = verifyEmail;

  // Depends on `token` and the mutate function specifically (not the whole
  // `verifyEmail` object, whose identity changes with every state update
  // like isPending -- that would re-run this on every mutation state
  // change instead of only when the token itself changes). TanStack
  // Query's `mutate` reference is stable across renders, so this runs
  // exactly once per token, matching the one-time nature of email
  // verification.
  useEffect(() => {
    verify({ token });
  }, [token, verify]);

  if (verifyEmail.isPending || verifyEmail.isIdle) {
    return <LoadingState label={t('verifying')} />;
  }

  if (verifyEmail.isSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <Alert variant="success">{t('successDescription')}</Alert>
        <Button asChild>
          <Link href="/login">{t('continueToLogin')}</Link>
        </Button>
      </div>
    );
  }

  const isTokenIssue =
    verifyEmail.error instanceof ApiError &&
    (verifyEmail.error.code === AUTH_ERROR_CODES.tokenExpired || verifyEmail.error.code === AUTH_ERROR_CODES.tokenInvalid);

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="danger" title={isTokenIssue ? t('invalidLinkTitle') : t('genericErrorTitle')}>
        {isTokenIssue ? t('invalidLinkDescription') : t('genericErrorDescription')}
      </Alert>
      <Button asChild variant="outline">
        <Link href="/login">{t('backToLogin')}</Link>
      </Button>
    </div>
  );
}
