'use client';

import { AlertTriangle, MoreHorizontal } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useRouter } from '@/shared/i18n/navigation';
import { useState } from 'react';
import { useStartOrGetThread } from '@/features/messaging/hooks/use-start-or-get-thread';
import type { Appointment } from '@/features/patient/api/types';
import { usePatientAppointments } from '@/features/patient/hooks/use-patient-appointments';
import { selectNeedsAttention } from '@/features/patient/lib/upcoming-appointments';
import { Alert } from '@/shared/ui/alert';
import { PersonAvatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { ErrorState } from '@/shared/ui/error-state';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { SkeletonRow } from '@/shared/ui/skeletons';
import { StatusBadge } from '@/shared/ui/status-badge';
import { getCairoNow } from '@/shared/lib/date/timezone';
import { formatCurrency } from '@/shared/lib/currency/format-currency';

const MAX_ITEMS = 4;

function AttentionItem({ appointment, kind }: { appointment: Appointment; kind: 'awaitingUpdate' | 'expired' }) {
  const t = useTranslations('patient.dashboard.needsAttention');
  const tHome = useTranslations('patientHome');
  const format = useFormatter();
  const router = useRouter();
  const startThread = useStartOrGetThread();
  const [messageError, setMessageError] = useState(false);

  // Only what the appointment payload really carries: a fee is present only
  // while a paid request is still awaiting payment.
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
      <div className="flex flex-wrap items-center gap-3">
        <PersonAvatar name={appointment.doctorName} src={appointment.doctorAvatarUrl} size="md" />
        <div className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
          <p className="text-small font-medium text-text-primary">
            {kind === 'awaitingUpdate' ? t('awaitingUpdate', { doctor: appointment.doctorName }) : t('expiredRequest', { doctor: appointment.doctorName })}
          </p>
          <p className="flex flex-wrap items-center gap-2 text-caption text-text-tertiary">
            <span>{date}</span>
            {amount && <span>· {t('fee', { amount })}</span>}
          </p>
        </div>
        <StatusBadge status={kind === 'awaitingUpdate' ? 'awaiting_outcome' : 'expired'} />
        <div className="flex items-center gap-1">
          <Button asChild size="sm" variant="secondary">
            <Link href={`/patient/appointments?highlight=${appointment.id}`}>{t('viewAppointment')}</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label={tHome('more')}>
                <Icon icon={MoreHorizontal} size="sm" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void messageDoctor()}>{t('messageDoctor')}</DropdownMenuItem>
              {kind === 'awaitingUpdate' && (
                <DropdownMenuItem asChild>
                  <Link href="/patient/disputes">{t('raiseDispute')}</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href={`/patient/appointments/book?doctorId=${appointment.doctorId}`}>{t('rebook')}</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {messageError && <Alert variant="danger">{t('messageError')}</Alert>}
    </li>
  );
}

/**
 * "Needs your attention": past-dated appointments still in a non-terminal
 * status and recently expired requests. Each item is ONE line -- avatar, what
 * happened, a status badge, one primary action ("View appointment") and an
 * overflow menu (Message, Dispute, Rebook). Warm-amber 10% wash with a
 * warning inline-start border (never a brown fill). Hidden entirely when
 * there is nothing to show. Every action is an existing feature.
 */
export function NeedsAttentionCard() {
  const t = useTranslations('patient.dashboard.needsAttention');
  const { data: appointments, isLoading, isError, refetch } = usePatientAppointments();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
        <SkeletonRow />
      </div>
    );
  }

  if (isError) {
    return <ErrorState size="sm" description={t('loadError')} onRetry={() => void refetch()} />;
  }

  const { awaitingUpdate, expired } = selectNeedsAttention(appointments ?? [], getCairoNow());
  const items = [
    ...awaitingUpdate.map((appointment) => ({ appointment, kind: 'awaitingUpdate' as const })),
    ...expired.map((appointment) => ({ appointment, kind: 'expired' as const })),
  ].slice(0, MAX_ITEMS);

  if (items.length === 0) return null;

  return (
    <section
      className="flex flex-col gap-3 rounded-(--r-card) border border-warning/30 border-s-4 border-s-warning bg-warning/10 p-(--card-pad)"
      aria-labelledby="needs-attention-title"
    >
      <h2 id="needs-attention-title" className="flex items-center gap-2 text-h3 text-text-primary">
        <Icon icon={AlertTriangle} size="md" className="text-warning-emphasis" />
        {t('title')}
      </h2>
      <ul className="flex flex-col divide-y divide-border-default">
        {items.map(({ appointment, kind }) => (
          <AttentionItem key={`${kind}-${appointment.id}`} appointment={appointment} kind={kind} />
        ))}
      </ul>
    </section>
  );
}
