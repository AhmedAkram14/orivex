'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCloseConsultation } from '@/features/consultation/hooks/use-close-consultation';
import { useConsultationSummary } from '@/features/consultation/hooks/use-consultation-summary';
import { useRecordDiagnosis } from '@/features/consultation/hooks/use-record-diagnosis';
import { useRecordNote } from '@/features/consultation/hooks/use-record-note';
import { useRecordVitals } from '@/features/consultation/hooks/use-record-vitals';
import { useRecommendFollowUp } from '@/features/consultation/hooks/use-recommend-follow-up';
import { useSignPrescription } from '@/features/consultation/hooks/use-sign-prescription';
import { useUpdateJourneyStage } from '@/features/consultation/hooks/use-update-journey-stage';
import type { JourneyStage } from '@/features/consultation/api/types';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
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
 * Health Journey stage-advance fix (ORIVEX Remaining Work Audit, P0 C5):
 * mirrors HealthJourney.advanceStage()'s own ALLOWED_TRANSITIONS exactly
 * (backend domain entity) -- Diagnosis -> FollowUp -> Monitoring ->
 * (Resolved | OngoingChronic), with ReferredOut reachable from any
 * non-terminal stage. Keeping the UI's offered options in sync with the
 * real backend rule means a doctor is never shown a transition that would
 * 422; the backend remains the actual source of truth/enforcement.
 */
const JOURNEY_STAGE_TRANSITIONS: Record<JourneyStage, JourneyStage[]> = {
  diagnosis: ['follow_up', 'referred_out'],
  follow_up: ['monitoring', 'referred_out'],
  monitoring: ['resolved', 'ongoing_chronic', 'referred_out'],
  resolved: [],
  ongoing_chronic: [],
  referred_out: [],
};

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
 * Prescriptions (ORIVEX Remaining Work Audit, P0 C4): a doctor signs one
 * medication per submission against a diagnosis already recorded this
 * session (the real backend requires a real diagnosisNodeId) -- gated
 * behind having recorded at least one diagnosis first, never a fabricated
 * one. No ReferenceDataModule drug catalog exists yet, so drugCatalogId is
 * a real client-minted id (crypto.randomUUID()), never a reference to a
 * catalog entry that doesn't exist; drugName carries the doctor's actual
 * free-text medication name and is what every consumer displays.
 * Journey (ORIVEX Remaining Work Audit, P0 C5): every one of this patient's
 * Health Journeys, with a stage-advance control offering only the real
 * backend's own allowed next stages (JOURNEY_STAGE_TRANSITIONS below) --
 * the actual enforcement stays server-side (JourneyController), this just
 * avoids offering a transition that would 422.
 */
export function ConsultationWorkspaceAction({ consultationSessionId }: ConsultationWorkspaceActionProps) {
  const t = useTranslations('consultation.workspace');
  const [open, setOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [diagnosisText, setDiagnosisText] = useState('');
  const [certaintyLevel, setCertaintyLevel] = useState<'suspected' | 'confirmed' | 'ruled_out'>('suspected');
  const [startJourney, setStartJourney] = useState(false);
  const [followUpReason, setFollowUpReason] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [systolicInput, setSystolicInput] = useState('');
  const [diastolicInput, setDiastolicInput] = useState('');
  const [bloodSugarInput, setBloodSugarInput] = useState('');
  const [vitalsJustSaved, setVitalsJustSaved] = useState(false);
  const [prescriptionDiagnosisNodeId, setPrescriptionDiagnosisNodeId] = useState('');
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [durationDaysInput, setDurationDaysInput] = useState('');
  const [instructions, setInstructions] = useState('');
  const [prescriptionJustSaved, setPrescriptionJustSaved] = useState(false);
  const [journeyStageSelections, setJourneyStageSelections] = useState<Record<string, JourneyStage | ''>>({});
  const [journeyJustSavedId, setJourneyJustSavedId] = useState<string | null>(null);

  const { data: summary, isLoading } = useConsultationSummary(open ? consultationSessionId : undefined);
  const recordNote = useRecordNote(consultationSessionId);
  const recordDiagnosis = useRecordDiagnosis(consultationSessionId);
  const recordVitals = useRecordVitals(consultationSessionId);
  const recommendFollowUp = useRecommendFollowUp(consultationSessionId);
  const signPrescription = useSignPrescription(consultationSessionId);
  const updateJourneyStage = useUpdateJourneyStage(consultationSessionId);
  const closeConsultation = useCloseConsultation();

  // Partial vitals are welcome (docs §8) -- weight/blood-sugar are each
  // independently optional, but blood pressure is only ever valid as a
  // complete systolic+diastolic pair or not entered at all (the backend
  // domain itself enforces this exact rule -- VitalReading.create() throws
  // without both). At least one group must be filled to save anything.
  const weightValue = weightInput.trim() ? Number(weightInput) : undefined;
  const systolicValue = systolicInput.trim() ? Number(systolicInput) : undefined;
  const diastolicValue = diastolicInput.trim() ? Number(diastolicInput) : undefined;
  const bloodSugarValue = bloodSugarInput.trim() ? Number(bloodSugarInput) : undefined;
  const weightInvalid = weightInput.trim() !== '' && !(Number.isFinite(weightValue) && weightValue! > 0);
  const bloodSugarInvalid = bloodSugarInput.trim() !== '' && !(Number.isFinite(bloodSugarValue) && bloodSugarValue! > 0);
  const systolicFilled = systolicInput.trim() !== '';
  const diastolicFilled = diastolicInput.trim() !== '';
  const bloodPressurePartial = systolicFilled !== diastolicFilled;
  const bloodPressureInvalid =
    !bloodPressurePartial &&
    systolicInput.trim() !== '' &&
    !(Number.isFinite(systolicValue) && systolicValue! > 0 && Number.isFinite(diastolicValue) && diastolicValue! > 0);
  const hasAnyVitalInput = Boolean(
    weightInput.trim() || systolicInput.trim() || diastolicInput.trim() || bloodSugarInput.trim(),
  );
  const vitalsHasError = weightInvalid || bloodPressurePartial || bloodPressureInvalid || bloodSugarInvalid;
  const canSaveVitals = hasAnyVitalInput && !vitalsHasError;

  async function handleSaveVitals() {
    try {
      await recordVitals.mutateAsync({
        weight: weightInvalid ? undefined : weightValue,
        systolic: bloodPressureInvalid || bloodPressurePartial ? undefined : systolicValue,
        diastolic: bloodPressureInvalid || bloodPressurePartial ? undefined : diastolicValue,
        bloodSugar: bloodSugarInvalid ? undefined : bloodSugarValue,
      });
    } catch {
      // Surfaced via recordVitals.isError below -- entered values stay in
      // place so nothing already typed is lost on a failed save.
      return;
    }
    setWeightInput('');
    setSystolicInput('');
    setDiastolicInput('');
    setBloodSugarInput('');
    setVitalsJustSaved(true);
    window.setTimeout(() => setVitalsJustSaved(false), 4000);
  }

  const durationDaysValue = durationDaysInput.trim() ? Number(durationDaysInput) : undefined;
  const durationDaysInvalid =
    durationDaysInput.trim() !== '' && !(Number.isInteger(durationDaysValue) && durationDaysValue! > 0);
  const hasAnyPrescriptionInput = Boolean(
    medicationName.trim() || dosage.trim() || frequency.trim() || durationDaysInput.trim() || instructions.trim(),
  );
  const canSavePrescription = Boolean(
    prescriptionDiagnosisNodeId &&
      medicationName.trim() &&
      dosage.trim() &&
      frequency.trim() &&
      !durationDaysInvalid &&
      durationDaysValue,
  );

  async function handleSavePrescription() {
    if (!prescriptionDiagnosisNodeId || !durationDaysValue) {
      return;
    }
    try {
      await signPrescription.mutateAsync({
        diagnosisNodeId: prescriptionDiagnosisNodeId,
        lineItem: {
          drugCatalogId: crypto.randomUUID(),
          drugName: medicationName.trim(),
          dosage: dosage.trim(),
          frequency: frequency.trim(),
          durationDays: durationDaysValue,
          instructions: instructions.trim() || undefined,
        },
      });
    } catch {
      // Surfaced via signPrescription.isError below -- entered values stay
      // in place so nothing already typed is lost on a failed save.
      return;
    }
    setMedicationName('');
    setDosage('');
    setFrequency('');
    setDurationDaysInput('');
    setInstructions('');
    setPrescriptionJustSaved(true);
    window.setTimeout(() => setPrescriptionJustSaved(false), 4000);
  }

  async function handleAdvanceJourney(journeyId: string, stage: JourneyStage) {
    try {
      await updateJourneyStage.mutateAsync({ journeyId, stage });
    } catch {
      // Surfaced via updateJourneyStage.isError below -- the selection stays
      // in place so the doctor doesn't have to re-pick it.
      return;
    }
    setJourneyStageSelections((prev) => ({ ...prev, [journeyId]: '' }));
    setJourneyJustSavedId(journeyId);
    window.setTimeout(() => setJourneyJustSavedId(null), 4000);
  }

  const hasAnyJourneySelection = Object.values(journeyStageSelections).some(Boolean);
  const hasUnsavedInput = Boolean(
    noteContent.trim() ||
      diagnosisText.trim() ||
      followUpReason.trim() ||
      hasAnyVitalInput ||
      hasAnyPrescriptionInput ||
      hasAnyJourneySelection,
  );

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
                <TabsTrigger value="vitals">{t('tabs.vitals')}</TabsTrigger>
                <TabsTrigger value="diagnosis">{t('tabs.diagnosis')}</TabsTrigger>
                <TabsTrigger value="followUp">{t('tabs.followUp')}</TabsTrigger>
                <TabsTrigger value="prescriptions">{t('tabs.prescriptions')}</TabsTrigger>
                <TabsTrigger value="journey">{t('tabs.journey')}</TabsTrigger>
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

              <TabsContent value="vitals" className="flex flex-col gap-4">
                {summary.vitalReadings.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-text-tertiary">{t('vitalsRecordedToday')}</p>
                    <ul className="flex flex-wrap gap-2">
                      {summary.vitalReadings.map((reading) => (
                        <li
                          key={reading.id}
                          className="rounded-full border border-border-default bg-surface-subtle px-3 py-1 text-sm text-text-secondary"
                        >
                          {reading.valueLabel}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">{t('vitalsEmpty')}</p>
                )}

                <div className="flex flex-col gap-3 rounded-lg border border-border-default p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="vitals-weight" className="text-sm font-medium text-text-primary">
                      {t('vitalsWeightLabel')}
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="vitals-weight"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.1"
                        className="w-24"
                        value={weightInput}
                        onChange={(event) => setWeightInput(event.target.value)}
                        aria-invalid={weightInvalid}
                      />
                      <span className="text-sm text-text-tertiary">{t('vitalsWeightUnit')}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span id="vitals-bp-label" className="text-sm font-medium text-text-primary">
                      {t('vitalsBloodPressureLabel')}
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        id="vitals-systolic"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="1"
                        placeholder={t('vitalsSystolicPlaceholder')}
                        aria-label={t('vitalsSystolicPlaceholder')}
                        aria-describedby="vitals-bp-label"
                        className="w-20"
                        value={systolicInput}
                        onChange={(event) => setSystolicInput(event.target.value)}
                        aria-invalid={bloodPressureInvalid || bloodPressurePartial}
                      />
                      <span aria-hidden="true" className="text-text-tertiary">
                        /
                      </span>
                      <Input
                        id="vitals-diastolic"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="1"
                        placeholder={t('vitalsDiastolicPlaceholder')}
                        aria-label={t('vitalsDiastolicPlaceholder')}
                        aria-describedby="vitals-bp-label"
                        className="w-20"
                        value={diastolicInput}
                        onChange={(event) => setDiastolicInput(event.target.value)}
                        aria-invalid={bloodPressureInvalid || bloodPressurePartial}
                      />
                      <span className="text-sm text-text-tertiary">{t('vitalsBloodPressureUnit')}</span>
                    </div>
                  </div>
                  {bloodPressurePartial && <p className="text-xs text-danger">{t('vitalsBloodPressurePartialError')}</p>}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="vitals-blood-sugar" className="text-sm font-medium text-text-primary">
                      {t('vitalsBloodSugarLabel')}
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="vitals-blood-sugar"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="1"
                        className="w-24"
                        value={bloodSugarInput}
                        onChange={(event) => setBloodSugarInput(event.target.value)}
                        aria-invalid={bloodSugarInvalid}
                      />
                      <span className="text-sm text-text-tertiary">{t('vitalsBloodSugarUnit')}</span>
                    </div>
                  </div>
                </div>

                {recordVitals.isError && <Alert variant="danger">{t('saveError')}</Alert>}
                {vitalsJustSaved && !recordVitals.isError && <Alert variant="success">{t('vitalsSaveSuccess')}</Alert>}
                <Button
                  type="button"
                  size="sm"
                  loading={recordVitals.isPending}
                  disabled={!canSaveVitals}
                  onClick={handleSaveVitals}
                >
                  {t('saveVitals')}
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
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <Checkbox checked={startJourney} onCheckedChange={(checked) => setStartJourney(checked === true)} />
                  {t('startJourneyLabel')}
                </label>
                {recordDiagnosis.isError && <Alert variant="danger">{t('saveError')}</Alert>}
                <Button
                  type="button"
                  size="sm"
                  loading={recordDiagnosis.isPending}
                  disabled={!diagnosisText.trim()}
                  onClick={async () => {
                    await recordDiagnosis.mutateAsync({ freeTextDescription: diagnosisText, certaintyLevel, startJourney });
                    setDiagnosisText('');
                    setStartJourney(false);
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

              <TabsContent value="prescriptions" className="flex flex-col gap-4">
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

                {summary.diagnoses.length === 0 ? (
                  <p className="text-sm text-text-secondary">{t('prescriptionNeedsDiagnosis')}</p>
                ) : (
                  <div className="flex flex-col gap-3 rounded-lg border border-border-default p-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="prescription-diagnosis" className="text-sm font-medium text-text-primary">
                        {t('prescriptionDiagnosisLabel')}
                      </label>
                      <Select value={prescriptionDiagnosisNodeId} onValueChange={setPrescriptionDiagnosisNodeId}>
                        <SelectTrigger id="prescription-diagnosis">
                          <SelectValue placeholder={t('prescriptionDiagnosisPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {summary.diagnoses.map((node) => (
                            <SelectItem key={node.id} value={node.id}>
                              {node.description ?? node.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="prescription-medication" className="text-sm font-medium text-text-primary">
                        {t('prescriptionMedicationLabel')}
                      </label>
                      <Input
                        id="prescription-medication"
                        value={medicationName}
                        onChange={(event) => setMedicationName(event.target.value)}
                        placeholder={t('prescriptionMedicationPlaceholder')}
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <div className="flex flex-1 flex-col gap-1.5">
                        <label htmlFor="prescription-dosage" className="text-sm font-medium text-text-primary">
                          {t('prescriptionDosageLabel')}
                        </label>
                        <Input
                          id="prescription-dosage"
                          value={dosage}
                          onChange={(event) => setDosage(event.target.value)}
                          placeholder={t('prescriptionDosagePlaceholder')}
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5">
                        <label htmlFor="prescription-frequency" className="text-sm font-medium text-text-primary">
                          {t('prescriptionFrequencyLabel')}
                        </label>
                        <Input
                          id="prescription-frequency"
                          value={frequency}
                          onChange={(event) => setFrequency(event.target.value)}
                          placeholder={t('prescriptionFrequencyPlaceholder')}
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5">
                        <label htmlFor="prescription-duration" className="text-sm font-medium text-text-primary">
                          {t('prescriptionDurationLabel')}
                        </label>
                        <Input
                          id="prescription-duration"
                          type="number"
                          inputMode="numeric"
                          min="1"
                          step="1"
                          value={durationDaysInput}
                          onChange={(event) => setDurationDaysInput(event.target.value)}
                          aria-invalid={durationDaysInvalid}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="prescription-instructions" className="text-sm font-medium text-text-primary">
                        {t('prescriptionInstructionsLabel')}
                      </label>
                      <Textarea
                        id="prescription-instructions"
                        value={instructions}
                        onChange={(event) => setInstructions(event.target.value)}
                        placeholder={t('prescriptionInstructionsPlaceholder')}
                        rows={2}
                      />
                    </div>

                    {signPrescription.isError && <Alert variant="danger">{t('saveError')}</Alert>}
                    {prescriptionJustSaved && !signPrescription.isError && (
                      <Alert variant="success">{t('prescriptionSaveSuccess')}</Alert>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      loading={signPrescription.isPending}
                      disabled={!canSavePrescription}
                      onClick={handleSavePrescription}
                    >
                      {t('savePrescription')}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="journey" className="flex flex-col gap-3">
                {summary.journeys.length === 0 ? (
                  <p className="text-sm text-text-secondary">{t('journeyEmpty')}</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {summary.journeys.map((journey) => {
                      const nextStages = JOURNEY_STAGE_TRANSITIONS[journey.stage];
                      const selected = journeyStageSelections[journey.id] ?? '';
                      return (
                        <li key={journey.id} className="flex flex-col gap-2 rounded-lg border border-border-default p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-medium text-text-primary">
                              {journey.rootNode.description ?? journey.rootNode.id}
                            </span>
                            <span className="rounded-full bg-secondary-subtle px-2 py-0.5 text-xs text-text-secondary">
                              {t(`journeyStage.${journey.stage}`)}
                            </span>
                          </div>
                          {nextStages.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Select
                                value={selected}
                                onValueChange={(value) =>
                                  setJourneyStageSelections((prev) => ({ ...prev, [journey.id]: value as JourneyStage }))
                                }
                              >
                                <SelectTrigger
                                  id={`journey-stage-${journey.id}`}
                                  aria-label={t('journeyNextStagePlaceholder')}
                                  className="w-48"
                                >
                                  <SelectValue placeholder={t('journeyNextStagePlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {nextStages.map((stage) => (
                                    <SelectItem key={stage} value={stage}>
                                      {t(`journeyStage.${stage}`)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                size="sm"
                                loading={updateJourneyStage.isPending}
                                disabled={!selected}
                                onClick={() => handleAdvanceJourney(journey.id, selected as JourneyStage)}
                              >
                                {t('advanceJourneyStage')}
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-text-tertiary">{t('journeyTerminalStage')}</p>
                          )}
                          {journeyJustSavedId === journey.id && !updateJourneyStage.isError && (
                            <Alert variant="success">{t('journeyStageSaveSuccess')}</Alert>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {updateJourneyStage.isError && <Alert variant="danger">{t('saveError')}</Alert>}
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
