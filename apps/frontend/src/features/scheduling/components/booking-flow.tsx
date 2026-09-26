'use client';

import { CalendarCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { Heading } from '@/design-system/typography';
import { useDoctorById } from '@/features/doctor/hooks/use-doctor-by-id';
import { AddToCalendarAction } from '@/features/patient/components/appointments/add-to-calendar-action';
import { IdentityVerificationGate } from '@/features/patient/components/identity-verification/identity-verification-gate';
import { PayNowForm } from '@/features/payment/components/pay-now-form';
import { useSpecialtiesList } from '@/features/reference/hooks/use-specialties-list';
import { SHARED_ERROR_CODES } from '@/shared/lib/api/error-codes';
import { Link, usePathname, useRouter } from '@/shared/i18n/navigation';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { useAvailabilityWindows } from '@/features/scheduling/hooks/use-availability-windows';
import { useBookAppointment } from '@/features/patient/hooks/use-book-appointment';
import type { AppointmentType, BookedAppointment } from '@/features/patient/api/types';
import type { AvailabilityWindowData } from '@/features/scheduling/types';
import { formatConsultationPrice } from '@/features/scheduling/utils/pricing';
import { DEFAULT_TIME_ZONE, getTimezoneOffsetLabel } from '@/features/scheduling/utils/timezone';
import { formatCurrency } from '@/shared/lib/currency/format-currency';
import { addDays } from '@/shared/lib/date/week';
import { getCairoNow } from '@/shared/lib/date/timezone';
import { cn } from '@/shared/lib/cn';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { PersonAvatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { Icon } from '@/shared/icons/icon';
import { InsetRow } from '@/shared/ui/inset-row';
import { PulseLine } from '@/shared/ui/pulse-line';
import { Illustration } from '@/shared/ui/illustrations/illustration';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { SpecialtyChip } from '@/shared/ui/specialty-chip';
import { LoadingCalendar } from '@/shared/ui/schedule/loading-calendar';
import { TimeGrid, type TimeGridSlot } from '@/shared/ui/schedule/time-grid';

const APPOINTMENT_TYPES: readonly AppointmentType[] = ['consultation', 'follow_up', 'new_patient', 'procedure'];
const DAYS_AHEAD = 7;

export interface BookingFlowProps {
  doctorId: string;
}

type Step = 'select' | 'summary' | 'payment' | 'confirmed';
const STEP_ORDER = ['select', 'review', 'confirmed'] as const;

function period(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * The real production booking flow: pick a real, backend-materialized
 * `AvailabilityWindow`, review, confirm via `POST /appointments` (then pay,
 * for a Paid slot). Every slot comes from `useAvailabilityWindows`; this
 * component never generates one. Redesigned as a three-step flow -- Date &
 * time, Review, Confirmed -- with a PulseLine progress, a 7-day scroller that
 * shows each day's slot count (and auto-selects the first day that has any),
 * slots grouped Morning / Afternoon / Evening, a review card that states the
 * time zone and shows slot price next to the doctor's standard fee, and a
 * confirmation with what to prepare.
 */
export function BookingFlow({ doctorId }: BookingFlowProps) {
  const t = useTranslations('scheduling.booking');
  const tUi = useTranslations('bookingUi');
  const format = useFormatter();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const bookAppointment = useBookAppointment();
  const { data: doctor } = useDoctorById(doctorId);
  const { data: specialties } = useSpecialtiesList();

  const today = useMemo(() => new Date(), []);
  const rangeStart = useMemo(() => {
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [today]);
  const rangeEnd = useMemo(() => addDays(rangeStart, DAYS_AHEAD), [rangeStart]);

  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<AvailabilityWindowData | null>(null);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('consultation');
  const [bookedAppointment, setBookedAppointment] = useState<BookedAppointment | null>(null);
  const [step, setStep] = useState<Step>('select');

  const { data: windows, isLoading, isError, refetch } = useAvailabilityWindows(doctorId, rangeStart.toISOString(), rangeEnd.toISOString());

  const days = useMemo(
    () =>
      Array.from({ length: DAYS_AHEAD }).map((_, index) => {
        const date = addDays(rangeStart, index);
        const dayKey = getCairoNow(date).toDateString();
        const dayWindows = (windows ?? [])
          .filter((window) => getCairoNow(new Date(window.startTime)).toDateString() === dayKey)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        return { date, windows: dayWindows };
      }),
    [windows, rangeStart],
  );

  // Auto-select the first day that has slots (once), rather than landing on an empty day.
  useEffect(() => {
    if (selectedDayIndex !== null || isLoading || !windows) return;
    const first = days.findIndex((day) => day.windows.length > 0);
    setSelectedDayIndex(first === -1 ? 0 : first);
  }, [days, isLoading, windows, selectedDayIndex]);

  const timezoneLabel = getTimezoneOffsetLabel(DEFAULT_TIME_ZONE, locale, today);

  const isFreeTierMonthlyCapError =
    bookAppointment.error instanceof ApiError && bookAppointment.error.code === SHARED_ERROR_CODES.freeTierMonthlyCapExceeded;
  const isNoShowRestrictedError =
    bookAppointment.error instanceof ApiError && bookAppointment.error.code === SHARED_ERROR_CODES.noShowBookingRestricted;
  const isConflictError = bookAppointment.error instanceof ApiError && bookAppointment.error.status === 409;

  const gateError =
    bookAppointment.error instanceof ApiError && bookAppointment.error.code === SHARED_ERROR_CODES.identityVerificationRequired
      ? bookAppointment.error
      : undefined;

  // Pay-then-confirm: a Paid booking lands Requested and the patient must pay
  // (the payment step) before it is usable; a Free booking goes straight to
  // the doctor-approval queue, so it confirms immediately.
  async function handleConfirm() {
    if (!selectedWindow) return;
    try {
      const appointment = await bookAppointment.mutateAsync({
        doctorId,
        availabilityWindowId: selectedWindow.id,
        appointmentType,
      });
      setBookedAppointment(appointment);
      if (appointment.consultationType === 'paid' && appointment.feeAmount !== null && appointment.feeCurrency !== null) {
        setStep('payment');
      } else {
        setStep('confirmed');
      }
    } catch {
      // Inline error rendered from bookAppointment.error, or the gate below.
    }
  }

  if (gateError) {
    return <IdentityVerificationGate action="booking" returnTo={`${pathname}?doctorId=${doctorId}`} />;
  }

  const specialtyRecord = doctor ? specialties?.find((specialty) => specialty.id === doctor.specialtyId) : undefined;
  const specialtyLabel = specialtyRecord ? pickLocalizedName(specialtyRecord.name, specialtyRecord.nameAr, locale) : undefined;

  function timeRange(window: AvailabilityWindowData) {
    const start = new Date(window.startTime);
    const end = new Date(window.endTime);
    return `${format.dateTime(start, { hour: 'numeric', minute: 'numeric' })} – ${format.dateTime(end, { hour: 'numeric', minute: 'numeric' })}`;
  }

  const currentStepKey = step === 'select' ? 'select' : step === 'confirmed' ? 'confirmed' : 'review';
  const stepIndex = STEP_ORDER.indexOf(currentStepKey);

  const progress = (
    <div className="flex flex-col gap-2" role="group" aria-label={tUi('stepsLabel')}>
      <ol className="flex items-center justify-between gap-2 text-small">
        {STEP_ORDER.map((key, index) => (
          <li
            key={key}
            aria-current={index === stepIndex ? 'step' : undefined}
            className={cn('flex items-center gap-2', index <= stepIndex ? 'font-semibold text-text-primary' : 'text-text-tertiary')}
          >
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-caption tabular-nums',
                index < stepIndex && 'bg-text-primary text-text-inverse',
                index === stepIndex && 'bg-pulse text-pulse-foreground',
                index > stepIndex && 'bg-surface-2',
              )}
            >
              {index + 1}
            </span>
            {key === 'review' && step === 'payment' ? tUi('steps.payment') : tUi(`steps.${key}`)}
          </li>
        ))}
      </ol>
      <PulseLine variant="progress" progress={stepIndex / (STEP_ORDER.length - 1)} />
    </div>
  );

  // ---- Payment
  if (step === 'payment' && bookedAppointment && bookedAppointment.feeAmount !== null && bookedAppointment.feeCurrency !== null) {
    return (
      <div className="flex flex-col gap-6">
        {progress}
        <div className="flex flex-col gap-3">
          <Heading as="h2" level={3}>{t('paymentStepTitle')}</Heading>
          <p className="text-body text-text-secondary">{t('paymentStepDescription')}</p>
          <PayNowForm
            appointmentId={bookedAppointment.id}
            amount={{ amount: bookedAppointment.feeAmount, currency: bookedAppointment.feeCurrency }}
            onPaid={() => setStep('confirmed')}
          />
        </div>
      </div>
    );
  }

  // ---- Confirmed
  if (step === 'confirmed' && bookedAppointment) {
    const paid = bookedAppointment.consultationType === 'paid';
    return (
      <div className="flex flex-col gap-6">
        {progress}
        <div className="flex flex-col items-center gap-4 rounded-(--r-card) border border-border-default bg-surface p-(--card-pad) text-center shadow-xs">
          <Illustration name="booking-confirmed" />
          <div className="flex max-w-prose flex-col gap-1">
            <Heading as="h2" level={2}>{paid ? tUi('confirmedTitlePaid') : tUi('confirmedTitleFree')}</Heading>
            <p className="text-body text-text-secondary">{paid ? tUi('confirmedDescriptionPaid') : tUi('confirmedDescriptionFree')}</p>
          </div>
          <div className="flex w-full max-w-md flex-col gap-2 text-start">
            <h3 className="text-h3 text-text-primary">{tUi('prepareTitle')}</h3>
            {(['one', 'two', 'three'] as const).map((key) => (
              <InsetRow key={key}>
                <Icon icon={CalendarCheck} size="sm" className="shrink-0 text-text-tertiary" />
                <span className="text-small text-text-secondary">{tUi(`prepare.${key}`)}</span>
              </InsetRow>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => router.push('/patient/appointments')}>{tUi('viewAppointments')}</Button>
            <AddToCalendarAction appointmentId={bookedAppointment.id} />
            <Button asChild variant="ghost">
              <Link href="/patient/doctors">{tUi('bookAnother')}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Review
  if (step === 'summary' && selectedWindow) {
    const priceLabel = formatConsultationPrice(selectedWindow, format, t('priceFree'));
    const start = new Date(selectedWindow.startTime);
    const durationMinutes = Math.round((new Date(selectedWindow.endTime).getTime() - start.getTime()) / 60_000);
    const profileFee = doctor?.consultationFeeAmount;
    const feeDiffers =
      profileFee !== undefined && profileFee > 0 && (selectedWindow.consultationType === 'free' || selectedWindow.feeAmount !== profileFee);
    const rows: { label: string; value: string }[] = [
      { label: tUi('rows.date'), value: format.dateTime(start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) },
      { label: tUi('rows.time'), value: timeRange(selectedWindow) },
      { label: tUi('rows.timezone'), value: tUi('cairoTime', { offset: timezoneLabel }) },
      { label: tUi('rows.duration'), value: t('durationMinutes', { minutes: durationMinutes }) },
      { label: tUi('rows.price'), value: t(`consultationType.${selectedWindow.consultationType}`) },
    ];
    const actionsDisabled = isConflictError || isFreeTierMonthlyCapError || isNoShowRestrictedError;

    return (
      <div className="flex flex-col gap-6">
        {progress}
        <div className="flex flex-col gap-4 rounded-(--r-card) border border-border-default bg-surface p-(--card-pad) shadow-xs">
          <Heading as="h2" level={3}>{tUi('reviewTitle')}</Heading>

          {bookAppointment.isError && !gateError && (
            <Alert variant="danger" role="alert">
              {isConflictError
                ? t('slotNoLongerAvailable')
                : isFreeTierMonthlyCapError
                  ? t('freeTierMonthlyCapReached')
                  : isNoShowRestrictedError
                    ? t('noShowBookingRestricted')
                    : bookAppointment.error instanceof ApiError
                      ? bookAppointment.error.message
                      : t('bookingFailed')}
            </Alert>
          )}

          {doctor && (
            <div className="flex items-center gap-3">
              <PersonAvatar name={doctor.fullName} src={doctor.avatarUrl} size="lg" />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-body font-semibold text-text-primary">
                  <bdi>{doctor.fullName}</bdi>
                </p>
                {specialtyRecord && specialtyLabel && <SpecialtyChip name={specialtyRecord.name} label={specialtyLabel} />}
              </div>
            </div>
          )}

          <dl className="flex flex-col gap-2">
            {rows.map((row) => (
              <InsetRow key={row.label} className="justify-between">
                <dt className="text-small text-text-tertiary">{row.label}</dt>
                <dd className="text-small font-medium text-text-primary" dir="auto">{row.value}</dd>
              </InsetRow>
            ))}
            <InsetRow className="justify-between">
              <dt className="text-small text-text-tertiary">{tUi('rows.type')}</dt>
              <dd className="w-52 max-w-full">
                <Select value={appointmentType} onValueChange={(value) => setAppointmentType(value as AppointmentType)}>
                  <SelectTrigger aria-label={t('appointmentType.label')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`appointmentType.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </dd>
            </InsetRow>
            <InsetRow className="justify-between">
              <dt className="text-small text-text-tertiary">{t('total')}</dt>
              <dd className={cn('font-display text-h3', selectedWindow.consultationType === 'free' ? 'text-success-emphasis' : 'text-text-primary')} data-numeric>
                {priceLabel}
              </dd>
            </InsetRow>
          </dl>

          {feeDiffers && profileFee !== undefined && (
            <p className="text-small text-text-tertiary">
              {tUi('standardFee', { fee: formatCurrency(format, profileFee, 'EGP'), price: priceLabel })}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {actionsDisabled ? (
              <Button
                variant="secondary"
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
                <Button variant="secondary" onClick={() => setStep('select')}>
                  {t('back')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Date & time
  const selectedDay = selectedDayIndex !== null ? days[selectedDayIndex] : undefined;
  const groups = (['morning', 'afternoon', 'evening'] as const).map((key) => ({
    key,
    slots: (selectedDay?.windows ?? []).filter((window) => period(getCairoNow(new Date(window.startTime)).getHours()) === key),
  }));

  const toGridSlot = (window: AvailabilityWindowData): TimeGridSlot => ({
    id: window.id,
    timeLabel: format.dateTime(new Date(window.startTime), { hour: 'numeric', minute: 'numeric' }),
    status: 'available',
    label: formatConsultationPrice(window, format, t('priceFree')),
    priceVariant: window.consultationType === 'free' ? 'free' : 'paid',
    onSelect: () => {
      setSelectedWindow(window);
      setStep('summary');
    },
  });

  return (
    <div className="flex flex-col gap-6">
      {progress}

      {isLoading && <LoadingCalendar />}
      {isError && <ErrorState description={t('loadError')} onRetry={() => void refetch()} />}

      {!isLoading && !isError && (
        <>
          {/* 7-day scroller: each day shows its real slot count. */}
          <div role="group" aria-label={tUi('daysLabel')} className="scrollbar-hidden -mx-1 flex snap-x gap-2 overflow-x-auto px-1 py-1">
            {days.map((day, index) => {
              const selected = index === selectedDayIndex;
              return (
                <button
                  key={day.date.toISOString()}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedDayIndex(index)}
                  className={cn(
                    'flex min-h-20 w-20 shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-md border px-2 py-2 transition-colors duration-(--duration-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
                    selected ? 'border-text-primary bg-text-primary text-text-inverse' : 'border-border-strong bg-surface hover:bg-surface-2',
                    day.windows.length === 0 && !selected && 'text-text-tertiary',
                  )}
                >
                  <span className="text-caption">{format.dateTime(day.date, { weekday: 'short' })}</span>
                  <span dir="ltr" className="font-display text-h3 tabular-nums">{format.dateTime(day.date, { day: 'numeric' })}</span>
                  <span className="text-caption">
                    {day.windows.length > 0 ? tUi('slotsCount', { count: day.windows.length }) : tUi('noSlotsDay')}
                  </span>
                </button>
              );
            })}
          </div>

          {(windows ?? []).length === 0 ? (
            <EmptyState illustration="calendar-clear" title={t('noSlotsTitle')} description={t('noSlotsDescription')} />
          ) : (
            <div className="flex flex-col gap-5">
              {groups
                .filter((group) => group.slots.length > 0)
                .map((group) => (
                  <section key={group.key} className="flex flex-col gap-2" aria-label={tUi(`periods.${group.key}`)}>
                    <h3 className="text-small font-medium text-text-tertiary">{tUi(`periods.${group.key}`)}</h3>
                    <TimeGrid slots={group.slots.map(toGridSlot)} className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4" />
                  </section>
                ))}
              {selectedDay && selectedDay.windows.length === 0 && (
                <EmptyState size="sm" illustration="calendar-clear" title={t('noSlotsTitle')} description={t('noSlotsDescription')} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
