'use client';

import { useMemo, useState } from 'react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { IdentityVerificationGate } from '@/features/patient/components/identity-verification/identity-verification-gate';
import { PayNowForm } from '@/features/payment/components/pay-now-form';
import { SHARED_ERROR_CODES } from '@/shared/lib/api/error-codes';
import { usePathname, useRouter } from '@/shared/i18n/navigation';
import { useAvailabilityWindows } from '@/features/scheduling/hooks/use-availability-windows';
import { useBookAppointment } from '@/features/patient/hooks/use-book-appointment';
import type { BookedAppointment } from '@/features/patient/api/types';
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

export interface BookingFlowProps {
  doctorId: string;
}

type Step = 'select' | 'summary' | 'payment';

/**
 * Onboarding Redesign integration-gap closure (2026-07-25): the real
 * production booking flow -- select a real, backend-materialized
 * `AvailabilityWindow`, review, confirm via `POST /appointments`. Every
 * slot rendered here comes from `useAvailabilityWindows`
 * (`GetBookableAvailabilityUseCase`); this component never generates a slot
 * itself (the old Milestone-4 "Booking Architecture" this replaces did,
 * client-side, against an MSW-only endpoint). No reschedule/cancel step
 * here -- a successful booking redirects to the real Patient Appointments
 * page, which is the one place appointment management lives; building a
 * second one here would duplicate it.
 */
export function BookingFlow({ doctorId }: BookingFlowProps) {
  const t = useTranslations('scheduling.booking');
  const format = useFormatter();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const bookAppointment = useBookAppointment();

  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedWindow, setSelectedWindow] = useState<AvailabilityWindowData | null>(null);
  const [bookedAppointment, setBookedAppointment] = useState<BookedAppointment | null>(null);
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

  const gateError =
    bookAppointment.error instanceof ApiError && bookAppointment.error.code === SHARED_ERROR_CODES.identityVerificationRequired
      ? bookAppointment.error
      : undefined;

  // Onboarding Redesign (2026-07-21 proposal, Stage O.4/O.7): the real
  // security boundary (RequiresIdentityVerificationGuard on POST
  // /appointments) surfaces as this exact ApiError code. `usePathname()`
  // never includes the query string, but `doctorId` (this page's only real
  // state) lives in it -- dropping it would "resume" a booking page with no
  // doctor selected, not the same booking context. Reconstruct it here
  // rather than relying on the bare pathname.
  if (gateError) {
    return <IdentityVerificationGate action="booking" returnTo={`${pathname}?doctorId=${doctorId}`} />;
  }

  function summaryFor(window: AvailabilityWindowData) {
    const start = new Date(window.startTime);
    const end = new Date(window.endTime);
    return {
      dateLabel: format.dateTime(start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      timeLabel: `${format.dateTime(start, { hour: 'numeric', minute: 'numeric' })} – ${format.dateTime(end, { hour: 'numeric', minute: 'numeric' })}`,
      durationMinutes: Math.round((end.getTime() - start.getTime()) / 60_000),
    };
  }

  // Slot conflict (409) -- someone else booked it, or it otherwise stopped
  // being Open, between the grid loading and confirm being pressed. The
  // grid has already been invalidated (useBookAppointment's onError), so
  // going back re-renders against fresh data instead of the stale slot.
  const isConflictError = bookAppointment.error instanceof ApiError && bookAppointment.error.status === 409;

  // Consultation Pricing Lifecycle Completion (pay-then-confirm): a Paid
  // booking lands Requested and is NOT confirmed by this call -- the
  // patient must pay next (this component's own 'payment' step) before the
  // appointment becomes usable. A Free booking still goes straight to the
  // doctor-approval queue (unchanged), so it redirects immediately just
  // like before.
  async function handleConfirm() {
    if (!selectedWindow) return;
    try {
      const appointment = await bookAppointment.mutateAsync({
        doctorId,
        availabilityWindowId: selectedWindow.id,
      });
      if (appointment.consultationType === 'paid' && appointment.feeAmount !== null && appointment.feeCurrency !== null) {
        setBookedAppointment(appointment);
        setStep('payment');
      } else {
        router.push('/patient/appointments');
      }
    } catch {
      // Inline error rendered below from bookAppointment.error, or the gate
      // above if it's the identity-verification case.
    }
  }

  if (step === 'payment' && bookedAppointment && bookedAppointment.feeAmount !== null && bookedAppointment.feeCurrency !== null) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text-primary">{t('paymentStepTitle')}</h2>
        <p className="text-sm text-text-secondary">{t('paymentStepDescription')}</p>
        <PayNowForm
          appointmentId={bookedAppointment.id}
          amount={{ amount: bookedAppointment.feeAmount, currency: bookedAppointment.feeCurrency }}
          onPaid={() => router.push('/patient/appointments')}
        />
      </div>
    );
  }

  if (step === 'summary' && selectedWindow) {
    const summary = summaryFor(selectedWindow);
    const priceLabel = formatConsultationPrice(selectedWindow, locale, t('priceFree'));
    return (
      <div className="flex flex-col gap-3">
        {bookAppointment.isError && !gateError && (
          <Alert variant="danger" role="alert">
            {isConflictError
              ? t('slotNoLongerAvailable')
              : bookAppointment.error instanceof ApiError
                ? bookAppointment.error.message
                : t('bookingFailed')}
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
                {t('back')}
              </Button>
            ) : (
              <>
                <Button loading={bookAppointment.isPending} onClick={handleConfirm}>
                  {t('confirm')}
                </Button>
                <Button variant="outline" onClick={() => setStep('select')}>
                  {t('back')}
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
