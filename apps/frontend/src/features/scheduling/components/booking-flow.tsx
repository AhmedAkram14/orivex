'use client';

import { useMemo, useState } from 'react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { getWeekDayName } from '@/features/doctor/lib/week';
import { WaitlistJoinCard } from '@/features/scheduling/components/waitlist-join-card';
import { useCancelBooking } from '@/features/scheduling/hooks/use-cancel-booking';
import { useCreateBooking } from '@/features/scheduling/hooks/use-create-booking';
import { bookingsKeys } from '@/features/scheduling/hooks/query-keys';
import { useRescheduleBooking } from '@/features/scheduling/hooks/use-reschedule-booking';
import { bookedRangesForDate } from '@/features/scheduling/utils/booked-ranges';
import { resolveDayForDate } from '@/features/scheduling/utils/resolve-day';
import { generateDaySlots } from '@/features/scheduling/utils/slots';
import { DEFAULT_TIME_ZONE, getTimezoneOffsetLabel } from '@/features/scheduling/utils/timezone';
import type { Booking, RecurringWeeklySchedule, ScheduleException, SchedulingRules, TimeSlotData } from '@/features/scheduling/types';
import { addDays, isSameDay } from '@/shared/lib/date/week';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { BookingSummaryCard } from '@/shared/ui/schedule/booking-summary-card';
import { DateNavigation } from '@/shared/ui/schedule/date-navigation';
import { TimeGrid, type TimeGridSlot } from '@/shared/ui/schedule/time-grid';

export interface BookingFlowProps {
  schedule: RecurringWeeklySchedule;
  exceptions: ScheduleException[];
  rules: SchedulingRules;
  bookings: Booking[];
}

type Step = 'select' | 'summary' | 'confirmed';

/**
 * The Booking Architecture (Milestone 4) — a real, mocked booking round
 * trip: select an available slot, review a summary, confirm, then manage
 * (cancel/reschedule) the resulting booking. A date with no available
 * slots offers `WaitlistJoinCard` instead of a dead end. "No real backend
 * logic" means no `SchedulingModule` reservation-hold integration — the
 * MSW-backed create/reschedule/cancel round trip itself is real, including
 * the "this slot was just taken" conflict path docs/roadmaps/frontend-
 * master-plan.md's Phase 9 section calls out by name.
 */
export function BookingFlow({ schedule, exceptions, rules, bookings }: BookingFlowProps) {
  const t = useTranslations('scheduling.booking');
  const format = useFormatter();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const createBooking = useCreateBooking();
  const rescheduleBooking = useRescheduleBooking();
  const cancelBooking = useCancelBooking();

  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotData | null>(null);
  const [step, setStep] = useState<Step>('select');
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const day = resolveDayForDate(selectedDate, getWeekDayName(selectedDate), schedule, exceptions);
  const bookedRanges = bookedRangesForDate(bookings, selectedDate);
  const daySlots = generateDaySlots(day, rules, selectedDate, today, bookedRanges);
  const availableSlots = daySlots.filter((slot) => slot.status === 'available');

  const gridSlots: TimeGridSlot[] = daySlots.map((slot) => ({
    id: slot.id,
    timeLabel: format.dateTime(new Date(slot.start), { hour: 'numeric', minute: 'numeric' }),
    status: slot.status === 'past' ? 'blocked' : slot.status,
    onSelect:
      slot.status === 'available'
        ? () => {
            setSelectedSlot(slot);
            setStep('summary');
            setConflictMessage(null);
          }
        : undefined,
  }));

  const durationLabel = t('durationMinutes', { minutes: rules.slotDurationMinutes });
  const timezoneLabel = getTimezoneOffsetLabel(DEFAULT_TIME_ZONE, locale, today);

  function summaryFor(slot: TimeSlotData) {
    return {
      dateLabel: format.dateTime(new Date(slot.start), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      timeLabel: `${format.dateTime(new Date(slot.start), { hour: 'numeric', minute: 'numeric' })} – ${format.dateTime(new Date(slot.end), { hour: 'numeric', minute: 'numeric' })}`,
    };
  }

  async function handleConfirm() {
    if (!selectedSlot) return;
    const request = { slotStart: selectedSlot.start, slotEnd: selectedSlot.end };

    try {
      const booking =
        isRescheduling && activeBooking
          ? await rescheduleBooking.mutateAsync({ id: activeBooking.id, request })
          : await createBooking.mutateAsync(request);
      setActiveBooking(booking);
      setIsRescheduling(false);
      setStep('confirmed');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setConflictMessage(error.message);
        setSelectedSlot(null);
        setStep('select');
        queryClient.invalidateQueries({ queryKey: bookingsKeys.list() });
      }
    }
  }

  async function handleCancelConfirmed() {
    if (!activeBooking) return;
    await cancelBooking.mutateAsync(activeBooking.id);
    setActiveBooking(null);
    setSelectedSlot(null);
    setStep('select');
    setCancelDialogOpen(false);
  }

  if (step === 'confirmed' && activeBooking) {
    const summary = summaryFor({ id: activeBooking.id, start: activeBooking.slotStart, end: activeBooking.slotEnd, status: 'booked' });
    return (
      <>
        <BookingSummaryCard
          {...summary}
          durationLabel={durationLabel}
          timezoneLabel={timezoneLabel}
          status="confirmed"
          statusLabel={t('confirmed')}
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsRescheduling(true);
                  setSelectedSlot(null);
                  setStep('select');
                }}
              >
                {t('reschedule')}
              </Button>
              <Button variant="ghost" onClick={() => setCancelDialogOpen(true)}>
                {t('cancel')}
              </Button>
            </>
          }
        />

        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('cancelDialogTitle')}</DialogTitle>
              <DialogDescription>{t('cancelDialogDescription')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                {t('cancelDialogKeep')}
              </Button>
              <Button variant="danger" loading={cancelBooking.isPending} onClick={handleCancelConfirmed}>
                {t('cancelDialogConfirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (step === 'summary' && selectedSlot) {
    const summary = summaryFor(selectedSlot);
    return (
      <div className="flex flex-col gap-3">
        {createBooking.error instanceof ApiError && createBooking.error.status !== 409 && (
          <Alert variant="danger" role="alert">
            {createBooking.error.message}
          </Alert>
        )}
        <BookingSummaryCard
          {...summary}
          durationLabel={durationLabel}
          timezoneLabel={timezoneLabel}
          status="pending"
          statusLabel={t('review')}
          actions={
            <>
              <Button loading={createBooking.isPending || rescheduleBooking.isPending} onClick={handleConfirm}>
                {t('confirm')}
              </Button>
              <Button variant="outline" onClick={() => setStep('select')}>
                {t('back')}
              </Button>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {conflictMessage && (
        <Alert variant="danger" role="alert">
          {conflictMessage}
        </Alert>
      )}

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

      {availableSlots.length > 0 ? (
        <TimeGrid slots={gridSlots} />
      ) : (
        <WaitlistJoinCard date={selectedDate.toISOString().slice(0, 10)} />
      )}
    </div>
  );
}
