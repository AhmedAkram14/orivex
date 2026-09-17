'use client';

import { AlertTriangle, Paperclip, X } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
import { Heading } from '@/design-system/typography';
import { useDoctorUpcomingWork } from '@/features/doctor/hooks/use-doctor-upcoming-work';
import { usePatientAppointments } from '@/features/patient/hooks/use-patient-appointments';
import { useMyDisputes } from '@/features/consultation/hooks/use-my-disputes';
import { useRaiseDispute } from '@/features/consultation/hooks/use-raise-dispute';
import { useWithdrawDispute } from '@/features/consultation/hooks/use-withdraw-dispute';
import { useAuth } from '@/shared/auth/auth-context';
import { useUploadMediaAsset } from '@/shared/media/hooks/use-upload-media-asset';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';
import type { Dispute, DisputeCategory } from '@/features/consultation/api/types';

export interface DisputesWorkspaceProps {
  role: 'patient' | 'doctor';
}

const STATUS_VARIANT: Record<Dispute['status'], 'warning' | 'success' | 'neutral'> = {
  open: 'warning',
  resolved: 'success',
  dismissed: 'neutral',
  withdrawn: 'neutral',
};

// Dispute System Hardening Phase 0: matches DisputeCategory's real backend
// enum values exactly.
const CATEGORIES: DisputeCategory[] = ['no_show', 'payment_refund', 'conduct', 'technical_issue', 'other'];

type StatusFilter = 'all' | Dispute['status'];
const STATUS_FILTERS: StatusFilter[] = ['all', 'open', 'resolved', 'dismissed', 'withdrawn'];

// Matches RaiseDisputeRequestDto's real `reason` constraints (MaxLength(1000))
// -- the minimum of 30 is a client-side-only floor (the backend only enforces
// MinLength(1)) meant to discourage a one-word, unreviewable report.
const MIN_REASON_LENGTH = 30;
const MAX_REASON_LENGTH = 1000;
const REASON_TEXTAREA_ID = 'dispute-reason';

// Mirrors `message-composer.tsx`'s own attachment state machine exactly --
// same accepted types/size ceiling, reused via the same `useUploadMediaAsset`
// upload-intent -> PUT -> confirm flow, just with `dispute_attachment` as the
// MediaAsset purpose instead of `message_attachment`.
const ACCEPTED_FILE_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';
const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const REASON_PREVIEW_LENGTH = 140;
function previewReason(reason: string): string {
  if (reason.length <= REASON_PREVIEW_LENGTH) return reason;
  return `${reason.slice(0, REASON_PREVIEW_LENGTH).trimEnd()}…`;
}

/**
 * I11 -- Admin dispute resolution (ORIVEX Remaining Work Audit): the
 * patient/doctor-facing surface -- raise a dispute about a real appointment
 * and track its status, mirroring `MessagingWorkspace`'s own
 * appointment-picker pattern (same client-side counterparty-name resolution,
 * since neither `Dispute` nor `MessageThread` carries a display name).
 *
 * Dispute System Hardening: visibility is now bidirectional (a dispute
 * raised by the counterparty on a shared appointment can appear in "My
 * disputes" too) -- nothing here presumes the current account raised every
 * row it renders; only the real raiser sees a Withdraw action on a row.
 */
export function DisputesWorkspace({ role }: DisputesWorkspaceProps) {
  const t = useTranslations('disputes');
  const format = useFormatter();
  const { user } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<DisputeCategory | ''>('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [attachmentFileName, setAttachmentFileName] = useState<string | undefined>(undefined);
  const [attachmentAssetId, setAttachmentAssetId] = useState<string | undefined>(undefined);
  const [attachmentRejection, setAttachmentRejection] = useState<'tooLarge' | 'typeNotAllowed' | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patientAppointments = usePatientAppointments({ enabled: role === 'patient' });
  const doctorUpcomingWork = useDoctorUpcomingWork({ enabled: role === 'doctor' });
  const disputesQuery = useMyDisputes();
  const raiseDispute = useRaiseDispute();
  const uploadAttachment = useUploadMediaAsset();

  const isLoading = (role === 'patient' ? patientAppointments.isLoading : doctorUpcomingWork.isLoading) || disputesQuery.isLoading;
  const isError = (role === 'patient' ? patientAppointments.isError : doctorUpcomingWork.isError) || disputesQuery.isError;

  const appointments = useMemo(() => {
    if (role === 'patient') {
      // Expired-appointment leak: `status` used to be dropped entirely here,
      // so a stale Expired appointment (one whose Requested slot went stale
      // before AppointmentExpiryReconciliationService's sweep ran) stayed
      // pickable forever. The doctor-side source below already excludes
      // Expired server-side (`getDoctorUpcomingWork`'s own filter) -- this is
      // the one place that still needed it.
      return (patientAppointments.data ?? [])
        .filter((appointment) => appointment.status !== 'expired')
        .map((appointment) => ({ id: appointment.id, counterpartyName: appointment.doctorName, scheduledAt: appointment.scheduledAt }));
    }
    return (doctorUpcomingWork.data ?? []).map((item) => ({ id: item.id, counterpartyName: item.title, scheduledAt: item.scheduledAt }));
  }, [role, patientAppointments.data, doctorUpcomingWork.data]);

  const counterpartyNameByAppointmentId = useMemo(
    () => new Map(appointments.map((appointment) => [appointment.id, appointment.counterpartyName])),
    [appointments],
  );

  const disputes = useMemo(() => disputesQuery.data ?? [], [disputesQuery.data]);
  const disputedAppointmentIds = useMemo(() => new Set(disputes.map((dispute) => dispute.appointmentId)), [disputes]);
  const eligibleAppointments = appointments.filter((appointment) => !disputedAppointmentIds.has(appointment.id));

  // Status filter (Phase 3): client-side over the already-fetched list --
  // matches this component's own existing "no server-side pagination" scale
  // assumption.
  const filteredDisputes = useMemo(
    () => (statusFilter === 'all' ? disputes : disputes.filter((dispute) => dispute.status === statusFilter)),
    [disputes, statusFilter],
  );

  function resetForm() {
    setSelectedAppointmentId('');
    setReason('');
    setCategory('');
    setAcknowledged(false);
    setAttachmentFileName(undefined);
    setAttachmentAssetId(undefined);
    setAttachmentRejection(undefined);
  }

  function closePicker() {
    setPickerOpen(false);
    resetForm();
    raiseDispute.reset();
  }

  const canSubmit =
    Boolean(selectedAppointmentId) &&
    Boolean(category) &&
    reason.trim().length >= MIN_REASON_LENGTH &&
    acknowledged &&
    !uploadAttachment.isPending;

  async function handleRaise() {
    if (!canSubmit || !category) return;
    try {
      await raiseDispute.mutateAsync({ appointmentId: selectedAppointmentId, reason, category, attachmentAssetId });
      closePicker();
    } catch {
      // Inline error rendered below from raiseDispute.error.
    }
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setAttachmentRejection(undefined);
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setAttachmentRejection('typeNotAllowed');
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachmentRejection('tooLarge');
      return;
    }

    try {
      const asset = await uploadAttachment.mutateAsync({ file, purpose: 'dispute_attachment' });
      setAttachmentAssetId(asset.id);
      setAttachmentFileName(file.name);
    } catch {
      // Inline error rendered below from uploadAttachment.error.
    }
  }

  function removeAttachment() {
    setAttachmentAssetId(undefined);
    setAttachmentFileName(undefined);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  const raiseTrigger = (
    <Button type="button" onClick={() => setPickerOpen(true)} disabled={eligibleAppointments.length === 0}>
      {t('raiseAction')}
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Empty-state CTA (Phase 3): only one "Raise a dispute" trigger shown
          at a time -- the empty state's own action button once the list is
          empty, this above-card button otherwise. */}
      {disputes.length > 0 && <div>{raiseTrigger}</div>}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          {/* Heading hierarchy (Phase 3): mirrors `MessagingWorkspace`'s own
              H1 -> H2 fix -- the workspace H1 (page title) is rendered by
              WorkspaceHeader above this component, so the section title here
              must be a real h2, not the h3 `CardTitle` renders. Uses the
              `Heading` primitive's own level/tag independence (already
              established by `DisputeQueue`'s sibling fix in this same audit)
              instead of adding a second, redundant sr-only heading with the
              same visible text right next to a visible one. */}
          <Heading as="h2" level={3}>
            {t('myDisputesTitle')}
          </Heading>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="w-40" aria-label={t('statusFilterLabel')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((value) => (
                <SelectItem key={value} value={value}>
                  {value === 'all' ? t('statusFilterAll') : t(`status.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {disputes.length === 0 ? (
            <EmptyState icon={AlertTriangle} title={t('emptyTitle')} description={t('emptyDescription')} action={raiseTrigger} />
          ) : (
            <>
              <p className="text-sm text-text-tertiary">{t('totalCount', { count: filteredDisputes.length })}</p>
              {filteredDisputes.length === 0 ? (
                <p className="text-sm text-text-secondary">{t('noFilterResults')}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {filteredDisputes.map((dispute) => {
                    const isRaiser = Boolean(user) && user?.id === dispute.raisedByAccountId;
                    return (
                      <li key={dispute.id} className="flex flex-col gap-1 rounded-2xl border border-border-default p-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-text-primary">
                            {counterpartyNameByAppointmentId.get(dispute.appointmentId) ?? t('unknownCounterparty')}
                          </span>
                          <div className="flex items-center gap-2">
                            {dispute.category && <Badge variant="neutral">{t(`category.${dispute.category}`)}</Badge>}
                            <Badge variant={STATUS_VARIANT[dispute.status]}>{t(`status.${dispute.status}`)}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-text-secondary">{previewReason(dispute.reason)}</p>
                        <p className="text-xs text-text-tertiary">
                          {format.dateTime(new Date(dispute.createdAt), { dateStyle: 'medium' })}
                        </p>
                        {dispute.status !== 'open' && dispute.resolutionNotes && (
                          <p className="text-xs text-text-tertiary">
                            {t('resolutionLabel')}: {dispute.resolutionNotes}
                          </p>
                        )}
                        {dispute.status === 'open' && isRaiser && (
                          <div className="mt-1">
                            <WithdrawDisputeAction disputeId={dispute.id} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={pickerOpen} onOpenChange={(open) => !open && closePicker()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('raiseDialogTitle')}</DialogTitle>
            <DialogDescription>{t('raiseDialogDescription')}</DialogDescription>
          </DialogHeader>
          {/* Scope/process copy (Phase 3): what a dispute is for and what
              happens next -- no invented SLA/timeframe number, matching the
              PRD's own refund-policy section (conduct/no-show/technical are
              the reviewable categories; pure clinical-outcome dissatisfaction
              is explicitly out of scope, which is why it isn't a category). */}
          <p className="text-xs text-text-tertiary">{t('scopeNote')}</p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleRaise();
            }}
            className="flex flex-col gap-3"
          >
            <Select value={selectedAppointmentId} onValueChange={setSelectedAppointmentId}>
              <SelectTrigger aria-label={t('appointmentLabel')}>
                <SelectValue placeholder={t('appointmentPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {eligibleAppointments.map((appointment) => (
                  <SelectItem key={appointment.id} value={appointment.id}>
                    {appointment.counterpartyName} — {format.dateTime(new Date(appointment.scheduledAt), { dateStyle: 'medium' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={category} onValueChange={(value) => setCategory(value as DisputeCategory)}>
              <SelectTrigger aria-label={t('categoryLabel')}>
                <SelectValue placeholder={t('categoryPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`category.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-col gap-1">
              <label htmlFor={REASON_TEXTAREA_ID} className="text-sm font-medium text-text-primary">
                {t('reasonLabel')}
              </label>
              <Textarea
                id={REASON_TEXTAREA_ID}
                value={reason}
                onChange={(event) => setReason(event.target.value.slice(0, MAX_REASON_LENGTH))}
                placeholder={t('reasonPlaceholder')}
                maxLength={MAX_REASON_LENGTH}
                rows={4}
              />
              <span className="self-end text-xs text-text-tertiary">
                {t('reasonCounter', { length: reason.length, max: MAX_REASON_LENGTH })}
              </span>
            </div>

            {uploadAttachment.isError && <Alert variant="danger">{t('attachmentUploadError')}</Alert>}
            {attachmentRejection === 'tooLarge' && <Alert variant="danger">{t('attachmentTooLarge')}</Alert>}
            {attachmentRejection === 'typeNotAllowed' && <Alert variant="danger">{t('attachmentTypeNotAllowed')}</Alert>}

            {attachmentFileName && (
              <div className="flex w-fit items-center gap-2 rounded-md bg-secondary-subtle px-2.5 py-1 text-xs text-text-secondary">
                <Icon icon={Paperclip} size="xs" />
                {attachmentFileName}
                <button type="button" onClick={removeAttachment} aria-label={t('removeAttachment')}>
                  <Icon icon={X} size="xs" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_EXTENSIONS}
                className="hidden"
                onChange={handleFileSelected}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                loading={uploadAttachment.isPending}
              >
                <Icon icon={Paperclip} size="sm" />
                {t('attachFile')}
              </Button>
              <span className="text-xs text-text-tertiary">{t('attachmentHint')}</span>
            </div>

            <label className="flex items-start gap-2 text-sm text-text-secondary">
              <Checkbox checked={acknowledged} onCheckedChange={(checked) => setAcknowledged(checked === true)} className="mt-0.5" />
              {t('acknowledgment')}
            </label>

            {raiseDispute.isError && <Alert variant="danger">{t('raiseError')}</Alert>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closePicker}>
                {t('cancel')}
              </Button>
              <Button type="submit" loading={raiseDispute.isPending} disabled={!canSubmit}>
                {t('confirmRaise')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Withdraw (Phase 3): the raiser's own retraction of a still-Open dispute --
 * mirrors `CancelAction`'s exact "Dialog wraps its own trigger Button" shape
 * (a plain confirm, not a multi-step flow), proportionate to a low-stakes
 * self-service undo.
 */
function WithdrawDisputeAction({ disputeId }: { disputeId: string }) {
  const t = useTranslations('disputes');
  const [open, setOpen] = useState(false);
  const withdrawDispute = useWithdrawDispute();

  function closeDialog() {
    setOpen(false);
    withdrawDispute.reset();
  }

  async function handleConfirm() {
    try {
      await withdrawDispute.mutateAsync(disputeId);
      setOpen(false);
    } catch {
      // Inline error rendered below from withdrawDispute.error.
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t('withdrawAction')}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('withdrawDialogTitle')}</DialogTitle>
          <DialogDescription>{t('withdrawDialogDescription')}</DialogDescription>
        </DialogHeader>

        {withdrawDispute.isError && <Alert variant="danger">{t('withdrawError')}</Alert>}

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            {t('cancel')}
          </Button>
          <Button variant="danger" loading={withdrawDispute.isPending} onClick={handleConfirm}>
            {t('confirmWithdraw')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
