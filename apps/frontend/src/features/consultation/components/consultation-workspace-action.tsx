'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCloseConsultation } from '@/features/consultation/hooks/use-close-consultation';
import { useConsultationSummary } from '@/features/consultation/hooks/use-consultation-summary';
import { useRecordDiagnosis } from '@/features/consultation/hooks/use-record-diagnosis';
import { useRecordNote } from '@/features/consultation/hooks/use-record-note';
import { useRecommendFollowUp } from '@/features/consultation/hooks/use-recommend-follow-up';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Textarea } from '@/shared/ui/textarea';

export interface ConsultationWorkspaceActionProps {
  consultationSessionId: string;
}

/**
 * Consultation lifecycle completion follow-up (2026-07-26): the doctor's
 * single reachable entry point for clinical documentation during/after a
 * call (§6 of the fix's own scope: "make sure existing capabilities are
 * reachable... rather than isolated screens") plus the explicit clinical-
 * completion action itself (§4: "Complete Consultation" must be
 * unmistakably distinct from "Leave call", which only lives in
 * `JoinCallAction`/`CallRoom`). None of Notes/Diagnosis/Follow-up are
 * mandatory -- the existing domain requires none of them, and this
 * preserves that (§6: "do not blindly make all of these mandatory").
 * Prescriptions are shown read-only: creating one requires a real Drug
 * Catalog reference that doesn't exist anywhere in this system yet (no
 * ReferenceDataModule drug catalog) -- fabricating a fake catalog id would
 * be worse than not building the form, so that capability stays
 * disclosed-but-unbuilt rather than faked (§14/§20).
 */
export function ConsultationWorkspaceAction({ consultationSessionId }: ConsultationWorkspaceActionProps) {
  const t = useTranslations('consultation.workspace');
  const [open, setOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [diagnosisText, setDiagnosisText] = useState('');
  const [certaintyLevel, setCertaintyLevel] = useState<'suspected' | 'confirmed' | 'ruled_out'>('suspected');
  const [followUpReason, setFollowUpReason] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const { data: summary, isLoading } = useConsultationSummary(open ? consultationSessionId : undefined);
  const recordNote = useRecordNote(consultationSessionId);
  const recordDiagnosis = useRecordDiagnosis(consultationSessionId);
  const recommendFollowUp = useRecommendFollowUp(consultationSessionId);
  const closeConsultation = useCloseConsultation();

  const hasUnsavedInput = Boolean(noteContent.trim() || diagnosisText.trim() || followUpReason.trim());

  async function handleComplete() {
    if (hasUnsavedInput && !window.confirm(t('unsavedWorkWarning'))) {
      return;
    }
    await closeConsultation.mutateAsync({ consultationSessionId, completionReason: 'completed' });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t('openAction')}
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        {isLoading && <Skeleton className="h-64 w-full" />}

        {summary && (
          <div className="flex flex-col gap-4">
            <Tabs defaultValue="notes">
              <TabsList>
                <TabsTrigger value="notes">{t('tabs.notes')}</TabsTrigger>
                <TabsTrigger value="diagnosis">{t('tabs.diagnosis')}</TabsTrigger>
                <TabsTrigger value="followUp">{t('tabs.followUp')}</TabsTrigger>
                <TabsTrigger value="prescriptions">{t('tabs.prescriptions')}</TabsTrigger>
              </TabsList>

              <TabsContent value="notes" className="flex flex-col gap-3">
                {summary.clinicalNotes.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {summary.clinicalNotes.map((note) => (
                      <li key={note.id} className="rounded-lg border border-border-default p-3 text-sm text-text-secondary">
                        {note.content}
                      </li>
                    ))}
                  </ul>
                )}
                <Textarea
                  value={noteContent}
                  onChange={(event) => setNoteContent(event.target.value)}
                  placeholder={t('notesPlaceholder')}
                  rows={4}
                />
                {recordNote.isError && <Alert variant="danger">{t('saveError')}</Alert>}
                <Button
                  type="button"
                  size="sm"
                  loading={recordNote.isPending}
                  disabled={!noteContent.trim()}
                  onClick={async () => {
                    await recordNote.mutateAsync(noteContent);
                    setNoteContent('');
                  }}
                >
                  {t('saveNote')}
                </Button>
              </TabsContent>

              <TabsContent value="diagnosis" className="flex flex-col gap-3">
                {summary.diagnoses.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {summary.diagnoses.map((node) => (
                      <li key={node.id} className="rounded-lg border border-border-default p-3 text-sm text-text-secondary">
                        {node.description} <span className="text-text-tertiary">({t(`certainty.${node.certaintyLevel}`)})</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Textarea
                  value={diagnosisText}
                  onChange={(event) => setDiagnosisText(event.target.value)}
                  placeholder={t('diagnosisPlaceholder')}
                  rows={3}
                />
                <Select value={certaintyLevel} onValueChange={(value) => setCertaintyLevel(value as typeof certaintyLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suspected">{t('certainty.suspected')}</SelectItem>
                    <SelectItem value="confirmed">{t('certainty.confirmed')}</SelectItem>
                    <SelectItem value="ruled_out">{t('certainty.ruled_out')}</SelectItem>
                  </SelectContent>
                </Select>
                {recordDiagnosis.isError && <Alert variant="danger">{t('saveError')}</Alert>}
                <Button
                  type="button"
                  size="sm"
                  loading={recordDiagnosis.isPending}
                  disabled={!diagnosisText.trim()}
                  onClick={async () => {
                    await recordDiagnosis.mutateAsync({ freeTextDescription: diagnosisText, certaintyLevel });
                    setDiagnosisText('');
                  }}
                >
                  {t('saveDiagnosis')}
                </Button>
              </TabsContent>

              <TabsContent value="followUp" className="flex flex-col gap-3">
                {summary.followUpRecommendation ? (
                  <Alert variant="info">
                    {summary.followUpRecommendation.reason}
                    {summary.followUpRecommendation.recommendedDate
                      ? ` — ${new Date(summary.followUpRecommendation.recommendedDate).toLocaleDateString(undefined, { timeZone: 'Africa/Cairo' })}`
                      : ''}
                  </Alert>
                ) : (
                  <>
                    <Textarea
                      value={followUpReason}
                      onChange={(event) => setFollowUpReason(event.target.value)}
                      placeholder={t('followUpReasonPlaceholder')}
                      rows={3}
                    />
                    <Input
                      type="date"
                      value={followUpDate}
                      onChange={(event) => setFollowUpDate(event.target.value)}
                    />
                    {recommendFollowUp.isError && <Alert variant="danger">{t('saveError')}</Alert>}
                    <Button
                      type="button"
                      size="sm"
                      loading={recommendFollowUp.isPending}
                      disabled={!followUpReason.trim()}
                      onClick={async () => {
                        await recommendFollowUp.mutateAsync({
                          reason: followUpReason,
                          recommendedDate: followUpDate || undefined,
                        });
                        setFollowUpReason('');
                        setFollowUpDate('');
                      }}
                    >
                      {t('saveFollowUp')}
                    </Button>
                  </>
                )}
              </TabsContent>

              <TabsContent value="prescriptions">
                {summary.prescriptions.length === 0 ? (
                  <p className="text-sm text-text-secondary">{t('noPrescriptions')}</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {summary.prescriptions.map((prescription) => (
                      <li key={prescription.id} className="rounded-lg border border-border-default p-3 text-sm">
                        {prescription.lineItems.map((item) => (
                          <div key={`${prescription.id}-${item.drugName ?? item.drugCatalogId}`}>
                            {item.drugName ?? item.drugCatalogId} — {item.dosage}, {item.frequency}
                          </div>
                        ))}
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>

            {closeConsultation.isError && <Alert variant="danger">{t('completeError')}</Alert>}

            <Button type="button" loading={closeConsultation.isPending} onClick={handleComplete}>
              {t('completeConsultation')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
