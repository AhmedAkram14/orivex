'use client';

import { useTranslations } from 'next-intl';
import { useStartConsultation } from '@/features/consultation/hooks/use-start-consultation';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

export interface StartConsultationActionProps {
  consultationSessionId: string;
}

/**
 * Product follow-up (2026-07-26): renders on a Waiting Doctor Queue entry
 * -- the previously-missing entry point into `POST /consultations/:id/start`.
 * Mirrors `RefundButton`'s exact mutation-button shape.
 */
export function StartConsultationAction({ consultationSessionId }: StartConsultationActionProps) {
  const t = useTranslations('doctor.queue');
  const startConsultation = useStartConsultation();

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="sm"
        loading={startConsultation.isPending}
        onClick={() => startConsultation.mutate(consultationSessionId)}
      >
        {t('startConsultation')}
      </Button>
      {startConsultation.isError && <Alert variant="danger">{t('startConsultationFailed')}</Alert>}
    </div>
  );
}
