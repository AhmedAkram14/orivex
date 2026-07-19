'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CallRoom } from '@/features/telemedicine/components/call-room';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

export interface JoinCallActionProps {
  consultationSessionId: string;
}

/**
 * The reachable entry point into a telemedicine video call (ORIVEX Roadmap
 * 2.0 Stage 2) — a "Join video call" button rendered next to an
 * in-progress consultation, opening `CallRoom` in a wide dialog. Mirrors
 * `PayNowAction`'s exact dialog-opened-flow shape from Stage 1.
 */
export function JoinCallAction({ consultationSessionId }: JoinCallActionProps) {
  const t = useTranslations('telemedicine');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        {t('joinCall')}
      </Button>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('joinCall')}</DialogTitle>
        </DialogHeader>
        {open && <CallRoom consultationSessionId={consultationSessionId} onLeave={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
