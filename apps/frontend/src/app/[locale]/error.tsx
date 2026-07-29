'use client';

import { useEffect } from 'react';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/layout/page-container';
import { Logo } from '@/shared/ui/logo';
import { toUserMessage } from '@/shared/lib/api/error';

/**
 * Catches render/data errors within the locale segment (i.e. everything
 * under app/[locale]/). Next.js requires this to be a Client Component and
 * to accept exactly this (error, reset) prop shape. Sits alongside, not
 * instead of, the toast-based error reporting in shared/lib/api/error.ts —
 * a toast handles a failed background query; this handles a render-time
 * throw that would otherwise blank the page.
 */
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // No error-tracking provider chosen yet (Section 1.2); console is the only sink until Phase 30 wires one.
    console.error(error);
  }, [error]);

  return (
    <PageContainer size="sm">
      <Logo size="md" className="self-start" />
      <Alert variant="danger" title="Something went wrong">
        {toUserMessage(error)}
      </Alert>
      <Button onClick={reset} className="self-start">
        Try again
      </Button>
    </PageContainer>
  );
}
