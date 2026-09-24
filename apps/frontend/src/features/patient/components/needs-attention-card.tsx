'use client';

import { AlertTriangle } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useRouter } from '@/shared/i18n/navigation';
import { useState } from 'react';
import { useStartOrGetThread } from '@/features/messaging/hooks/use-start-or-get-thread';
import type { Appointment } from '@/features/patient/api/types';
import { usePatientAppointments } from '@/features/patient/hooks/use-patient-appointments';
import { selectNeedsAttention } from '@/features/patient/lib/upcoming-appointments';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Skeleton } from '@/shared/ui/skeleton';
import { getCairoNow } from '@/shared/lib/date/timezone';
import { formatCurrency } from '@/shared/lib/currency/format-currency';
import { Card, CardContent } from '@/shared/ui/card';

const MAX_ITEMS = 4;

function AttentionItem({ appointment, kind }: { appointment: Appointment; kind: 'awaitingUpdate' | 'expired' }) {
  const t = useTranslations('patient.dashboard.needsAttention');
  const format = useFormatter();
  const router = useRouter();
  const startThread = useStartOrGetThread();
  const [messageError, setMessageError] = useState(false);

  // Only what the appointment payload really carries: a fee is present only
  // while a paid request is still awaiting payment. Payment/refund state is
  // never inferred or shown -- the API doesn't provide it.
  const amount = appointment.feeAmount ? formatCurrency(format, appointment.feeAmount.amount, appointment.feeAmount.currency) : undefined;
  const date = format.dateTime(new Date(appointment.scheduledAt), { dateStyle: 'medium', timeStyle: 'short' });

  async function messageDoctor() {
    setMessageError(false);
    try {
      const thread = await startThread.mutateAsync(appointment.doctorId);
      router.push(`/patient/messages?thread=${thread.id}`);
    } catch {
      setMessageError(true);
    }
  }

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-text-primary">
          {kind === 'awaitingUpdate' ? t('awaitingUpdate', { doctor: appointment.doctorName }) : t('expiredRequest', { doctor: appointment.doctorName })}
        </p>
        <p className="text-xs text-text-tertiary">
          {date}
          {amount && <span> · {t('fee', { amount })}</span>}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/patient/appointments?highlight=${appointment.id}`}>{t('viewAppointment')}</Link>
        </Button>
        <Button size="sm" variant="outline" loading={startThread.isPending} onClick={messageDoctor}>
          {t('messageDoctor')}
        </Button>
        {kind === 'awaitingUpdate' && (
          <Button asChild size="sm" variant="outline">
            <Link href="/patient/disputes">{t('raiseDispute')}</Link>
          </Button>
        )}
        <Button asChild size="sm" variant="ghost">
          <Link href={`/patient/appointments/book?doctorId=${appointment.doctorId}`}>{t('rebook')}</Link>
        </Button>
      </div>
      {messageError && <Alert variant="danger">{t('messageError')}</Alert>}
    </li>
  );
}

/**
 * "Needs your attention": past-dated appointments still in a non-terminal
 * status (nothing resolved them) and recently expired requests. Hidden
 * entirely when there is nothing to show. Every action is an existing
 * feature (appointment row, message thread, Disputes, booking page) -- no
 * cancel on past appointments, and nothing is performed automatically.
 */
export function NeedsAttentionCard() {
  const t = useTranslations('patient.dashboard.needsAttention');
  const { data: appointments, isLoading, isError, refetch } = usePatientAppointments();

  if (isLoading) {
    return (
      <Card className="rounded-3xl border-warning/40">
        <CardContent className="flex flex-col gap-3 p-6" aria-busy="true" aria-live="polite">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Alert variant="danger">
        <span>{t('loadError')}</span>{' '}
        <button type="button" className="font-medium underline" onClick={() => refetch()}>
          {t('retry')}
        </button>
      </Alert>
    );
  }

  const { awaitingUpdate, expired } = selectNeedsAttention(appointments ?? [], getCairoNow());
  const items = [
    ...awaitingUpdate.map((appointment) => ({ appointment, kind: 'awaitingUpdate' as const })),
    ...expired.map((appointment) => ({ appointment, kind: 'expired' as const })),
  ].slice(0, MAX_ITEMS);

  if (items.length === 0) return null;

  return (
    <Card className="rounded-3xl border-warning/40 bg-warning-subtle/40" role="region" aria-labelledby="needs-attention-title">
      <CardContent className="flex flex-col gap-3 p-6">
        <h2 id="needs-attention-title" className="flex items-center gap-2 text-lg font-semibold text-text-primary">
          <Icon icon={AlertTriangle} size="md" className="text-warning" />
          {t('title')}
        </h2>
        <ul className="flex flex-col divide-y divide-border-default">
          {items.map(({ appointment, kind }) => (
            <AttentionItem key={`${kind}-${appointment.id}`} appointment={appointment} kind={kind} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
