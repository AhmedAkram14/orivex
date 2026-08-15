'use client';

import { useMemo, useState } from 'react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { PayNowForm } from '@/features/payment/components/pay-now-form';
import { useAvailabilityWindows } from '@/features/scheduling/hooks/use-availability-windows';
import { useRescheduleAppointment } from '@/features/patient/hooks/use-reschedule-appointment';
import type { RescheduledAppointment } from '@/features/patient/api/types';
import type { AvailabilityWindowData } from '@/features/scheduling/types';
import { formatConsultationPrice } from '@/features/scheduling/utils/pricing';
import { DEFAULT_TIME_ZONE, getTimezoneOffsetLabel } from '@/features/scheduling/utils/timezone';
import { addDays, isSameDay } from '@/shared/lib/date/week';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { BookingSummaryCard } from '@/shared/ui/schedule/booking-summary-card';
import { DateNavigation } from '@/shared/ui/schedule/date-navigation';
import { LoadingCalendar } from '@/shared/ui/schedule/loading-calendar';
import { TimeGrid, type TimeGridSlot } from '@/shared/ui/schedule/time-grid';

export interface RescheduleFlowProps {
  appointmentId: string;
  doctorId: string;
  onDone: () => void;
}

type Step = 'select' | 'summary' | 'payment' | 'success';

/**
 * Patient-Facing Reschedule (Phase 3 Step 2): the same real slot-selection
 * mechanics `BookingFlow` already established (`useAvailabilityWindows`,
 * `DateNavigation`/`TimeGrid`/`BookingSummaryCard`), composed around the
 * real `PATCH /appointments/:id` reschedule mutation instead of
 * `POST /appointments` -- deliberately not a second slot-picker
 * implementation. Lives inside a `Dialog` (see `RescheduleAction`), not a
 * page, so it has no router redirect on success -- it hands the resulting
 * appointment back to the caller instead (`onDone`), which closes the
 * dialog; the appointment list itself refetches via
 * `useRescheduleAppointment`'s own cache invalidation.
 */
export function RescheduleFlow({ appointmentId, doctorId, onDone }: RescheduleFlowProps) {
  const t = useTranslations('scheduling.booking');
  const tReschedule = useTranslations('patient.appointments.reschedule');
  const format = useFormatter();
  const locale = useLocale();
  const rescheduleAppointment = useRescheduleAppointment();

  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedWindow, setSelectedWindow] = useState<AvailabilityWindowData | null>(null);
  const [rescheduled, setRescheduled] = useState<RescheduledAppointment | null>(null);
  const [step, setStep] = useState<Step>('select');

  const rangeStart = useMemo(() => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [selectedDate]);
  const rangeEnd = useMemo(() => addDays(rangeStart, 1), [rangeStart]);

  const { data: windows, isLoading, isError } = useAvailabilityWindows(
    doctorId,
    rangeStart.toISOString(),
    rangeEnd.toISOString(),
  );

  const timezoneLabel = getTimezoneOffsetLabel(DEFAULT_TIME_ZONE, locale, today);

  // Real, distinct error states (never a single generic message): a 409 is
  // the real optimistic-locking conflict (someone else took the slot
  // between the grid loading and confirm being pressed) -- the grid has
  // already been invalidated (useRescheduleAppointment's onError), so going
  // back re-renders against fresh data. A 404/422 means the appointment
  // itself changed state in another tab (already rescheduled/cancelled, or
  // not found/not owned) -- there is no "back to select" recovery for that,
  // only acknowledging it and letting the caller refetch the list.
  const apiError = rescheduleAppointment.error instanceof ApiError ? rescheduleAppointment.error : undefined;
  const isConflictError = apiError?.status === 409;
  const isInvalidStateError = apiError?.status === 422;
  const isNotFoundError = apiError?.status === 404;

  function summaryFor(window: AvailabilityWindowData) {
    const start = new Date(window.startTime);
    const end = new Date(window.endTime);
    return {
      dateLabel: format.dateTime(start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      timeLabel: `${format.dateTime(start, { hour: 'numeric', minute: 'numeric' })} – ${format.dateTime(end, { hour: 'numeric', minute: 'numeric' })}`,
      durationMinutes: Math.round((end.getTime() - start.getTime()) / 60_000),
    };
  }

  async function handleConfirm() {
    if (!selectedWindow) return;
    try {
      const result = await rescheduleAppointment.mutateAsync({
        appointmentId,
        newAvailabilityWindowId: selectedWindow.id,
      });
      if (result.status === 'requested' && result.feeAmount !== null && result.feeCurrency !== null) {
        // New slot is Paid -- still Requested/unpaid, matching the real
        // backend exactly (a reschedule never auto-confirms a Paid slot).
        setRescheduled(result);
        setStep('payment');
      } else {
        // New slot is Free -- the backend auto-confirmed it, nothing left
        // to do but tell the patient it worked.
        setStep('success');
      }
    } catch {
      // Inline error rendered below from rescheduleAppointment.error.
    }
  }

  if (step === 'payment' && rescheduled && rescheduled.feeAmount !== null && rescheduled.feeCurrency !== null) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text-primary">{tReschedule('paymentStepTitle')}</h2>
        <p className="text-sm text-text-secondary">{tReschedule('paymentStepDescription')}</p>
        <PayNowForm
          appointmentId={rescheduled.id}
          amount={{ amount: rescheduled.feeAmount, currency: rescheduled.feeCurrency }}
          onPaid={() => setStep('success')}
        />
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="success" role="status">
          {tReschedule('successDescription')}
        </Alert>
        <Button onClick={onDone}>{tReschedule('done')}</Button>
      </div>
    );
  }

  if (step === 'summary' && selectedWindow) {
    const summary = summaryFor(selectedWindow);
    const priceLabel = formatConsultationPrice(selectedWindow, locale, t('priceFree'));

    if (isInvalidStateError || isNotFoundError) {
      return (
        <div className="flex flex-col gap-3">
          <Alert variant="danger" role="alert">
            {isNotFoundError ? tReschedule('notFoundError') : tReschedule('invalidStateError')}
          </Alert>
          <Button onClick={onDone}>{tReschedule('close')}</Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {rescheduleAppointment.isError && (
          <Alert variant="danger" role="alert">
            {isConflictError
              ? tReschedule('slotNoLongerAvailable')
              : apiError
                ? apiError.message
                : tReschedule('genericError')}
          </Alert>
        )}
        <BookingSummaryCard
          dateLabel={summary.dateLabel}
          timeLabel={summary.timeLabel}
          durationLabel={t('durationMinutes', { minutes: summary.durationMinutes })}
          timezoneLabel={timezoneLabel}
          status="pending"
          statusLabel={t('review')}
          consultationTypeLabel={t(`consultationType.${selectedWindow.consultationType}`)}
          totalCaption={t('total')}
          priceLabel={priceLabel}
          actions={
            isConflictError ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedWindow(null);
                  setStep('select');
                }}
              >
                {tReschedule('back')}
              </Button>
            ) : (
              <>
                <Button loading={rescheduleAppointment.isPending} onClick={handleConfirm}>
                  {tReschedule('confirm')}
                </Button>
                <Button variant="outline" onClick={() => setStep('select')}>
                  {tReschedule('back')}
                </Button>
              </>
            )
          }
        />
      </div>
    );
  }

  const gridSlots: TimeGridSlot[] = (windows ?? []).map((window) => ({
    id: window.id,
    timeLabel: format.dateTime(new Date(window.startTime), { hour: 'numeric', minute: 'numeric' }),
    status: 'available',
    label: formatConsultationPrice(window, locale, t('priceFree')),
    onSelect: () => {
      setSelectedWindow(window);
      setStep('summary');
    },
  }));

  return (
    <div className="flex flex-col gap-4">
      <DateNavigation
        onPrevious={() => setSelectedDate((date) => addDays(date, -1))}
        onNext={() => setSelectedDate((date) => addDays(date, 1))}
        onToday={() => setSelectedDate(today)}
        todayLabel={t('today')}
        previousLabel={t('previousDay')}
        nextLabel={t('nextDay')}
      />

      <p className="text-sm font-medium text-text-primary">
        {format.dateTime(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}
        {isSameDay(selectedDate, today) && ` (${t('today')})`}
      </p>

      {isLoading && <LoadingCalendar />}
      {isError && <Alert variant="danger">{t('loadError')}</Alert>}
      {!isLoading && !isError && (windows ?? []).length > 0 && <TimeGrid slots={gridSlots} />}
      {!isLoading && !isError && (windows ?? []).length === 0 && (
        <EmptyState title={t('noSlotsTitle')} description={t('noSlotsDescription')} />
      )}
    </div>
  );
}
