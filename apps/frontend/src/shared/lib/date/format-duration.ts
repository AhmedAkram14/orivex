/**
 * Phase 8 (Design System Consistency & Accessibility): the one shared
 * "minutes between two timestamps" computation. Before this helper existed,
 * the exact same `Math.round((end.getTime() - start.getTime()) / 60_000)`
 * expression was independently duplicated in the Patient Chart's
 * appointment-row duration, the Schedule page's appointment-block grid
 * layout, and both consultation-summary dialogs (patient-facing
 * `ConsultationOutcomeAction` and doctor-facing
 * `DoctorConsultationSummaryAction`) -- this is now the one place that
 * arithmetic lives.
 *
 * Deliberately does NOT own display/localization: "minutes" is a
 * translated word (`t('durationMinutes', { minutes })` in each caller's own
 * namespace), not something a plain, hook-free utility function can decide
 * on its own.
 */
export function getDurationMinutes(start: string | Date, end: string | Date): number {
  const startMs = start instanceof Date ? start.getTime() : new Date(start).getTime();
  const endMs = end instanceof Date ? end.getTime() : new Date(end).getTime();
  return Math.round((endMs - startMs) / 60_000);
}
