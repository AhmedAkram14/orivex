'use client';

import { MoreHorizontal, Plus, X } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useUpdateDoctorAvailability } from '@/features/scheduling/hooks/use-update-doctor-availability';
import {
  applyDefaultHoursToWorkingDays,
  copyDayTo,
  effectivePricing,
  hasErrors,
  isDraftDirty,
  isOverride,
  resetDayToDefault,
  summarize,
  toDraft,
  toSavePayload,
  updateDay,
  validateDraft,
  type WeeklyDraft,
} from '@/features/scheduling/lib/weekly-availability';
import type {
  ConsultationPricing,
  RecurringWeeklySchedule,
  TimeRange,
  WeekDay,
} from '@/features/scheduling/types';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { Icon } from '@/shared/icons/icon';
import { ApiError } from '@/shared/lib/api/client';
import { cn } from '@/shared/lib/cn';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/ui/accordion';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Input } from '@/shared/ui/input';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { Switch } from '@/shared/ui/switch';

/** Below this width the week is a list of collapsible day rows instead of a table. */
const TABLE_MIN_WIDTH = 680;
const MAX_BREAKS = 5;

type Labels = ReturnType<typeof useLabels>;

/** Every label and formatter the editor needs, in one place. */
function useLabels() {
  const t = useTranslations('scheduling.availability');
  const tEditor = useTranslations('scheduling.availability.editor');
  const tValidation = useTranslations('scheduling.availability.validation');
  const tDay = useTranslations('scheduling.weekDays');
  const format = useFormatter();
  return useMemo(() => {
    // Times are wall-clock "HH:mm" values with no day or zone: formatted as UTC so nothing shifts.
    const asDate = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return new Date(Date.UTC(2000, 0, 1, hours ?? 0, minutes ?? 0));
    };
    const timeOptions = { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' } as const;
    const hourOptions = { hour: 'numeric', timeZone: 'UTC' } as const;
    // Inside an LTR isolate an Arabic day-period ("ص") would still pull the dash and the next time into a
    // right-to-left run ("9:00 م 5:00 – ص"); a left-to-right mark after each Arabic run keeps start – end in order.
    const ltr = (text: string) => text.replace(/([\u0590-\u08FF]+)/g, '$1\u200E');
    return {
      t,
      tEditor,
      tValidation: tValidation as (key: string, values?: Record<string, string | number>) => string,
      dayName: (day: WeekDay) => tDay(day),
      shortDayName: (day: WeekDay) =>
        format.dateTime(new Date(Date.UTC(2023, 0, 1 + WEEK.indexOf(day))), {
          weekday: 'short',
          timeZone: 'UTC',
        }),
      range: (range: TimeRange) => {
        const options =
          range.start.endsWith(':00') && range.end.endsWith(':00') ? hourOptions : timeOptions;
        return ltr(
          range.start < range.end
            ? format.dateTimeRange(asDate(range.start), asDate(range.end), options)
            : `${format.dateTime(asDate(range.start), options)} – ${format.dateTime(asDate(range.end), options)}`,
        );
      },
      money: (amount: number, currency: string) =>
        format.number(amount, {
          style: 'currency',
          currency,
          currencyDisplay: 'code',
          minimumFractionDigits: 0,
          maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
        }),
    };
  }, [t, tEditor, tValidation, tDay, format]);
}

const WEEK: WeekDay[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

/** "Free", or the fee in its currency ("EGP 450"); a Paid price still missing its fee reads "Paid". */
function priceText(labels: Labels, pricing: ConsultationPricing) {
  if (pricing.pricingType === 'free') return labels.t('pricingTypeFree');
  return typeof pricing.feeAmount === 'number' && pricing.feeAmount > 0
    ? labels.money(pricing.feeAmount, pricing.feeCurrency?.trim() || 'EGP')
    : labels.t('pricingTypePaid');
}

/** A time range as text: kept left-to-right inside right-to-left text. */
function RangeText({ children }: { children: ReactNode }) {
  return (
    <bdi dir="ltr" className="tabular-nums">
      {children}
    </bdi>
  );
}

/** A start–end pair of the shared time inputs (compact, 36px). */
function TimePair({
  value,
  onChange,
  startLabel,
  endLabel,
  invalid,
  describedBy,
  compact = false,
}: {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  startLabel: string;
  endLabel: string;
  invalid?: boolean;
  describedBy?: string;
  /** Without the browser's picker icon (the time is typed, or stepped with the arrow keys), so a row stays narrow. */
  compact?: boolean;
}) {
  const input = cn(
    'h-9 px-2 text-sm tabular-nums',
    compact ? 'w-[6.25rem] [&::-webkit-calendar-picker-indicator]:hidden' : 'w-32',
  );
  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="time"
        aria-label={startLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={value.start}
        onChange={(event) => onChange({ ...value, start: event.target.value })}
        className={input}
      />
      <span className="text-text-tertiary" aria-hidden="true">
        –
      </span>
      <Input
        type="time"
        aria-label={endLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={value.end}
        onChange={(event) => onChange({ ...value, end: event.target.value })}
        className={input}
      />
    </div>
  );
}

/** A fee with its currency as an inline suffix inside the field (not a second field). */
function FeeInput({
  pricing,
  onChange,
  label,
  className,
}: {
  pricing: ConsultationPricing;
  onChange: (pricing: ConsultationPricing) => void;
  label: string;
  className?: string;
}) {
  const currency = pricing.feeCurrency?.trim() || 'EGP';
  return (
    <div className={cn('relative w-28', className)}>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        aria-label={label}
        value={pricing.feeAmount ?? ''}
        onChange={(event) =>
          onChange({
            ...pricing,
            feeAmount: event.target.value === '' ? null : Number(event.target.value),
          })
        }
        className="h-9 pe-12 tabular-nums"
      />
      <span
        className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs font-semibold text-text-tertiary"
        aria-hidden="true"
      >
        {currency}
      </span>
    </div>
  );
}

/** Free | Paid, and the fee when Paid. Switching keeps the fee typed so far (Free sends none on save). */
function PriceControl({
  labels,
  pricing,
  onChange,
  groupLabel,
  feeLabel,
}: {
  labels: Labels;
  pricing: ConsultationPricing;
  onChange: (pricing: ConsultationPricing) => void;
  groupLabel: string;
  feeLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl
        ariaLabel={groupLabel}
        value={pricing.pricingType}
        onChange={(pricingType) => onChange({ ...pricing, pricingType })}
        options={[
          { value: 'free', label: labels.t('pricingTypeFree') },
          { value: 'paid', label: labels.t('pricingTypePaid') },
        ]}
      />
      {pricing.pricingType === 'paid' && (
        <FeeInput pricing={pricing} onChange={onChange} label={feeLabel} />
      )}
    </div>
  );
}

/** "+ Break": a small popover with a time pair. */
function AddBreak({
  labels,
  dayName,
  disabled,
  onAdd,
}: {
  labels: Labels;
  dayName: string;
  disabled: boolean;
  onAdd: (range: TimeRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<TimeRange>({ start: '13:00', end: '14:00' });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-7 gap-1 px-2 text-xs"
          aria-label={labels.tEditor('addBreakFor', { day: dayName })}
        >
          <Icon icon={Plus} size="xs" />
          {labels.tEditor('addBreakShort')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-auto flex-col gap-3">
        <p className="text-small font-semibold text-text-primary">
          {labels.tEditor('addBreakTitle', { day: dayName })}
        </p>
        <TimePair
          value={range}
          onChange={setRange}
          startLabel={labels.tEditor('breakStart')}
          endLabel={labels.tEditor('breakEnd')}
        />
        <div className="flex justify-end gap-2">
          <PopoverClose asChild>
            <Button type="button" variant="ghost" size="sm">
              {labels.t('cancel')}
            </Button>
          </PopoverClose>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onAdd(range);
              setOpen(false);
            }}
          >
            {labels.tEditor('addBreakConfirm')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** A day's breaks as removable chips, then "+ Break". */
function Breaks({
  labels,
  dayName,
  breaks,
  onChange,
}: {
  labels: Labels;
  dayName: string;
  breaks: TimeRange[];
  onChange: (breaks: TimeRange[]) => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {breaks.map((range, index) => {
        const text = labels.range(range);
        return (
          <span
            key={`${range.start}-${range.end}-${index}`}
            data-break-chip=""
            className="inline-flex h-6 items-center gap-0.5 rounded-full bg-secondary-subtle ps-2 pe-0.5 text-xs font-semibold text-text-primary"
          >
            <RangeText>{text}</RangeText>
            <button
              type="button"
              aria-label={labels.tEditor('removeBreakNamed', { range: text, day: dayName })}
              onClick={() => onChange(breaks.filter((_, position) => position !== index))}
              className="flex size-5 items-center justify-center rounded-full text-text-tertiary hover:bg-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <Icon icon={X} size="xs" />
            </button>
          </span>
        );
      })}
      <AddBreak
        labels={labels}
        dayName={dayName}
        disabled={breaks.length >= MAX_BREAKS}
        onAdd={(range) =>
          onChange([...breaks, range].sort((a, b) => a.start.localeCompare(b.start)))
        }
      />
    </div>
  );
}

/** The price cell: "Default" (muted) or the day's own price as an accent chip; opens the price editor. */
function DayPrice({
  labels,
  draft,
  index,
  onChange,
}: {
  labels: Labels;
  draft: WeeklyDraft;
  index: number;
  onChange: (draft: WeeklyDraft) => void;
}) {
  const entry = draft.days[index]!;
  const dayName = labels.dayName(entry.day.dayOfWeek);
  const custom = entry.priceSource === 'custom';
  const shown = custom ? priceText(labels, entry.day.pricing) : labels.tEditor('priceDefault');
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={labels.tEditor('priceFor', { day: dayName, price: shown })}
          data-price-source={entry.priceSource}
          className={cn(
            'inline-flex h-7 max-w-full items-center justify-self-start rounded-full px-2.5 text-xs font-semibold whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
            custom
              ? 'border border-avail-stroke bg-avail-fill text-text-primary'
              : 'text-text-tertiary hover:bg-surface-2 hover:text-text-secondary',
          )}
        >
          <span className="truncate">{shown}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-auto min-w-64 flex-col gap-3">
        <p className="text-small font-semibold text-text-primary">
          {labels.tEditor('priceTitle', { day: dayName })}
        </p>
        <PriceControl
          labels={labels}
          pricing={effectivePricing(draft, index)}
          groupLabel={labels.t('pricingTypeLabel', { day: dayName })}
          feeLabel={labels.t('feeAmountLabel', { day: dayName })}
          onChange={(pricing) =>
            onChange(
              updateDay(draft, index, (current) => ({
                priceSource: 'custom',
                day: { ...current.day, pricing },
              })),
            )
          }
        />
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!custom}
            onClick={() =>
              onChange(
                updateDay(draft, index, (current) => ({ ...current, priceSource: 'default' })),
              )
            }
          >
            {labels.tEditor('useDefault')}
          </Button>
          <PopoverClose asChild>
            <Button type="button" size="sm">
              {labels.tEditor('done')}
            </Button>
          </PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** ⋯: copy this day to other days, or reset it to the defaults. */
function DayMenu({
  labels,
  draft,
  index,
  onChange,
}: {
  labels: Labels;
  draft: WeeklyDraft;
  index: number;
  onChange: (draft: WeeklyDraft) => void;
}) {
  const entry = draft.days[index]!;
  const dayName = labels.dayName(entry.day.dayOfWeek);
  const [targets, setTargets] = useState<WeekDay[]>([]);
  return (
    <DropdownMenu modal={false} onOpenChange={(open) => !open && setTargets([])}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={labels.tEditor('dayActions', { day: dayName })}
        >
          <Icon icon={MoreHorizontal} size="sm" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{labels.tEditor('copyTo')}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {draft.days
              .filter((other) => other.day.dayOfWeek !== entry.day.dayOfWeek)
              .map((other) => (
                <DropdownMenuCheckboxItem
                  key={other.day.dayOfWeek}
                  checked={targets.includes(other.day.dayOfWeek)}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(checked) =>
                    setTargets((current) =>
                      checked
                        ? [...current, other.day.dayOfWeek]
                        : current.filter((day) => day !== other.day.dayOfWeek),
                    )
                  }
                >
                  {labels.dayName(other.day.dayOfWeek)}
                </DropdownMenuCheckboxItem>
              ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={targets.length === 0}
              onSelect={() => onChange(copyDayTo(draft, index, targets))}
            >
              {labels.tEditor('copyApply', { count: targets.length })}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onSelect={() => onChange(resetDayToDefault(draft, index))}>
          {labels.tEditor('resetToDefault')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface RowProps {
  labels: Labels;
  draft: WeeklyDraft;
  index: number;
  errors: string[] | undefined;
  onChange: (draft: WeeklyDraft) => void;
}

function WorkingSwitch({ labels, draft, index, onChange }: Omit<RowProps, 'errors'>) {
  const entry = draft.days[index]!;
  return (
    <Switch
      checked={entry.day.isWorkingDay}
      onCheckedChange={(isWorkingDay) =>
        onChange(
          updateDay(draft, index, (current) => ({
            ...current,
            day: { ...current.day, isWorkingDay },
          })),
        )
      }
      aria-label={labels.t('workingDayToggle', { day: labels.dayName(entry.day.dayOfWeek) })}
    />
  );
}

function RowErrors({ id, errors }: { id: string; errors: string[] | undefined }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="col-span-full text-xs text-danger-emphasis" role="status">
      {errors.join(' ')}
    </p>
  );
}

/** A day as a table row (wide dialogs): switch + name, hours, breaks, price, ⋯. */
function TableRow({ labels, draft, index, errors, onChange }: RowProps) {
  const entry = draft.days[index]!;
  const { day } = entry;
  const dayName = labels.dayName(day.dayOfWeek);
  const errorId = useId();
  const setDay = (change: Partial<typeof day>) =>
    onChange(
      updateDay(draft, index, (current) => ({ ...current, day: { ...current.day, ...change } })),
    );
  return (
    <li
      data-day-row={day.dayOfWeek}
      data-override={isOverride(draft, index) || undefined}
      className={cn(
        'relative grid min-h-12 grid-cols-[8.5rem_13.25rem_minmax(0,1fr)_5.25rem_2rem] items-center gap-x-3 gap-y-1 border-b border-border-default py-1.5 ps-3 last:border-b-0',
        // The override bar: 3px in the accent stroke colour on the inline-start edge.
        'data-override:before:absolute data-override:before:inset-y-1.5 data-override:before:start-0 data-override:before:w-[3px] data-override:before:rounded-full data-override:before:bg-avail-stroke',
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <WorkingSwitch labels={labels} draft={draft} index={index} onChange={onChange} />
        <span className="truncate text-[15px] font-semibold text-text-primary">{dayName}</span>
      </div>
      {day.isWorkingDay ? (
        <>
          <TimePair
            compact
            value={day.hours}
            onChange={(hours) => setDay({ hours })}
            startLabel={labels.t('startTimeLabel', { day: dayName })}
            endLabel={labels.t('endTimeLabel', { day: dayName })}
            invalid={!!errors?.length}
            describedBy={errors?.length ? errorId : undefined}
          />
          <Breaks
            labels={labels}
            dayName={dayName}
            breaks={day.breaks}
            onChange={(breaks) => setDay({ breaks })}
          />
          <DayPrice labels={labels} draft={draft} index={index} onChange={onChange} />
        </>
      ) : (
        <span className="col-span-3 text-sm text-text-tertiary">
          {labels.tEditor('unavailable')}
        </span>
      )}
      <DayMenu labels={labels} draft={draft} index={index} onChange={onChange} />
      <RowErrors id={errorId} errors={errors} />
    </li>
  );
}

/** A day as a collapsible row (narrow screens): "Sun · 9:00 AM – 5:00 PM · Default"; open, it edits that day only. */
function CompactRow({ labels, draft, index, errors, onChange }: RowProps) {
  const entry = draft.days[index]!;
  const { day } = entry;
  const dayName = labels.dayName(day.dayOfWeek);
  const errorId = useId();
  const setDay = (change: Partial<typeof day>) =>
    onChange(
      updateDay(draft, index, (current) => ({ ...current, day: { ...current.day, ...change } })),
    );
  const price =
    entry.priceSource === 'custom'
      ? priceText(labels, entry.day.pricing)
      : labels.tEditor('priceDefault');
  return (
    <AccordionItem
      value={day.dayOfWeek}
      data-day-row={day.dayOfWeek}
      data-override={isOverride(draft, index) || undefined}
      className="relative ps-3 data-override:before:absolute data-override:before:inset-y-2 data-override:before:start-0 data-override:before:w-[3px] data-override:before:rounded-full data-override:before:bg-avail-stroke"
    >
      <div className="flex items-center gap-3">
        <WorkingSwitch labels={labels} draft={draft} index={index} onChange={onChange} />
        <AccordionTrigger className="min-w-0 gap-2 py-2.5" disabled={!day.isWorkingDay}>
          <span className="flex min-w-0 items-baseline gap-1.5 truncate text-sm">
            <span className="text-[15px] font-semibold text-text-primary">
              {labels.shortDayName(day.dayOfWeek)}
            </span>
            <span aria-hidden="true" className="text-text-tertiary">
              ·
            </span>
            {day.isWorkingDay ? (
              <>
                <RangeText>{labels.range(day.hours)}</RangeText>
                <span aria-hidden="true" className="text-text-tertiary">
                  ·
                </span>
                <span
                  className={
                    entry.priceSource === 'custom'
                      ? 'font-semibold text-text-primary'
                      : 'text-text-tertiary'
                  }
                >
                  {price}
                </span>
              </>
            ) : (
              <span className="text-text-tertiary">{labels.tEditor('unavailable')}</span>
            )}
          </span>
        </AccordionTrigger>
      </div>
      {errors?.length ? (
        <p id={errorId} className="pb-2 text-xs text-danger-emphasis" role="status">
          {errors.join(' ')}
        </p>
      ) : null}
      <AccordionContent className="flex flex-col gap-3 text-text-primary">
        <TimePair
          value={day.hours}
          onChange={(hours) => setDay({ hours })}
          startLabel={labels.t('startTimeLabel', { day: dayName })}
          endLabel={labels.t('endTimeLabel', { day: dayName })}
          invalid={!!errors?.length}
          describedBy={errors?.length ? errorId : undefined}
        />
        <Breaks
          labels={labels}
          dayName={dayName}
          breaks={day.breaks}
          onChange={(breaks) => setDay({ breaks })}
        />
        <div className="flex items-center justify-between gap-2">
          <DayPrice labels={labels} draft={draft} index={index} onChange={onChange} />
          <DayMenu labels={labels} draft={draft} index={index} onChange={onChange} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

/** The editor's own width (the dialog's), so the layout follows the space it really has. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    setWidth(node.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

export interface WeeklyAvailabilityEditorProps {
  schedule: RecurringWeeklySchedule;
  onSaved: () => void;
  /** Cancel: the caller closes (behind its own discard confirm while there are unsaved changes). */
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** Forces a layout (tests); by default it follows the editor's own width. */
  layout?: 'table' | 'rows';
}

/**
 * The Weekly Availability editor: shared defaults (session price, default hours) above a compact week of seven rows,
 * with a sticky footer (a summary, Cancel, Save changes). A day that differs from the defaults carries a 3px accent
 * bar and its own price chip. The API is unchanged: each day still saves its explicit hours, breaks and price, in the
 * same payload as before (`toSavePayload`).
 */
export function WeeklyAvailabilityEditor({
  schedule,
  onSaved,
  onCancel,
  onDirtyChange,
  layout,
}: WeeklyAvailabilityEditorProps) {
  const labels = useLabels();
  const { t, tEditor, tValidation } = labels;
  const updateAvailability = useUpdateDoctorAvailability();
  const [draft, setDraft] = useState<WeeklyDraft>(() => toDraft(schedule));
  const { ref, width } = useWidth<HTMLDivElement>();
  const compact = layout ? layout === 'rows' : width > 0 && width < TABLE_MIN_WIDTH;

  const dirty = useMemo(() => isDraftDirty(draft, schedule), [draft, schedule]);
  const errors = useMemo(() => validateDraft(draft, tValidation), [draft, tValidation]);
  const invalid = hasErrors(errors);
  const summary = summarize(draft);

  useUnsavedChangesGuard(dirty, t('unsavedChangesWarning'));
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  async function save() {
    if (!dirty || invalid) return;
    try {
      await updateAvailability.mutateAsync(toSavePayload(draft, tValidation));
      onSaved();
    } catch {
      // Shown inline from `updateAvailability.error`.
    }
  }

  const setDefaults = (change: Partial<WeeklyDraft['defaults']>) =>
    setDraft((current) => ({ ...current, defaults: { ...current.defaults, ...change } }));

  return (
    <>
      <div ref={ref} className="min-h-0 flex-1 overflow-y-auto px-6 pt-3 pb-4 max-sm:px-4">
        {updateAvailability.error instanceof ApiError && (
          <Alert variant="danger" role="alert" className="mb-4">
            {updateAvailability.error.message}
          </Alert>
        )}

        <section aria-labelledby="weekly-defaults-label" className="flex flex-col gap-1.5">
          <h3 id="weekly-defaults-label" className="text-[13px] font-semibold text-text-primary">
            {tEditor('defaultsLabel')}
          </h3>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-(--r-card) bg-surface-2 p-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-secondary">
                {tEditor('sessionPrice')}
              </span>
              <PriceControl
                labels={labels}
                pricing={draft.defaults.pricing}
                onChange={(pricing) => setDefaults({ pricing })}
                groupLabel={tEditor('sessionPrice')}
                feeLabel={tEditor('defaultFee')}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-secondary">
                {tEditor('defaultHours')}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <TimePair
                  compact
                  value={draft.defaults.hours}
                  onChange={(hours) => setDefaults({ hours })}
                  startLabel={tEditor('defaultStart')}
                  endLabel={tEditor('defaultEnd')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraft(applyDefaultHoursToWorkingDays)}
                >
                  {tEditor('applyToAll')}
                </Button>
              </div>
            </div>
            {errors.defaults.length > 0 && (
              <p className="w-full text-xs text-danger-emphasis" role="status">
                {errors.defaults.join(' ')}
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="weekly-week-label" className="mt-4 flex flex-col gap-1.5">
          <h3 id="weekly-week-label" className="text-[13px] font-semibold text-text-primary">
            {tEditor('weekLabel')}
          </h3>
          {compact ? (
            <Accordion type="single" collapsible className="flex flex-col">
              {draft.days.map((entry, index) => (
                <CompactRow
                  key={entry.day.dayOfWeek}
                  labels={labels}
                  draft={draft}
                  index={index}
                  errors={errors.days.get(index)}
                  onChange={setDraft}
                />
              ))}
            </Accordion>
          ) : (
            <ul className="flex flex-col">
              {draft.days.map((entry, index) => (
                <TableRow
                  key={entry.day.dayOfWeek}
                  labels={labels}
                  draft={draft}
                  index={index}
                  errors={errors.days.get(index)}
                  onChange={setDraft}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border-default px-6 py-3 max-sm:px-4">
        <p data-weekly-summary="" className="text-small text-text-secondary">
          {tEditor('summary', {
            days: summary.workingDays,
            hours: Number(summary.hoursPerWeek.toFixed(1)),
            custom: summary.customPriceDays,
          })}
        </p>
        <div className="ms-auto flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={!dirty || invalid}
            loading={updateAvailability.isPending}
          >
            {tEditor('saveChanges')}
          </Button>
        </div>
      </footer>
    </>
  );
}
