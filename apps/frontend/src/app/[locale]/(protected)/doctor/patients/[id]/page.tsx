'use client';

import {
  Activity,
  CalendarDays,
  ClipboardList,
  Droplet,
  Droplets,
  FileText,
  HeartPulse,
  Mail,
  MapPin,
  Phone,
  Pill,
  Scale,
  Shield,
  Stethoscope,
  Upload,
  UserRoundPlus,
} from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import {
  useDoctorPatientChartAppointments,
  useDoctorPatientChartDocuments,
  useDoctorPatientChartMedicalRecords,
  useDoctorPatientChartPrescriptions,
  useDoctorPatientChartProfile,
  useDoctorPatientChartVitals,
} from '@/features/doctor/hooks/use-doctor-patient-chart';
import { useApproveAppointment } from '@/features/doctor/hooks/use-approve-appointment';
import { useDeclineAppointment } from '@/features/doctor/hooks/use-decline-appointment';
import { isUpcomingAppointment, NON_TERMINAL_APPOINTMENT_STATUSES } from '@/features/doctor/lib/appointment-status';
import { useAddPatientCondition } from '@/features/doctor/hooks/use-add-patient-condition';
import { useUploadPatientDocument } from '@/features/doctor/hooks/use-upload-patient-document';
import { AppointmentStatusBadge } from '@/features/doctor/components/appointments/appointment-status-badge';
import { CancelAppointmentDialog } from '@/features/doctor/components/appointments/cancel-appointment-dialog';
import { DoctorConsultationSummaryAction } from '@/features/consultation/components/doctor-consultation-summary-action';
import { RequireRole } from '@/shared/auth/require-role';
import { Alert } from '@/shared/ui/alert';
import { ApiError } from '@/shared/lib/api/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/icons/icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Heading } from '@/design-system/typography';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Page } from '@/shared/ui/layout/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Textarea } from '@/shared/ui/textarea';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { usePathname, useRouter } from '@/shared/i18n/navigation';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';
import { cn } from '@/shared/lib/cn';
import { getDurationMinutes } from '@/shared/lib/date/format-duration';
import { formatRelativeTime } from '@/shared/lib/date/relative-time';
import type {
  DoctorPatientChartAppointment,
  DoctorPatientChartMedicalRecordEntry,
  DoctorPatientChartPrescription,
  DoctorPatientDocumentPurpose,
} from '@/features/doctor/api/types';
import { AllergyBanner } from './_components/allergy-banner';
import { CopyButton } from './_components/copy-button';
import { InfoTile } from './_components/info-tile';
import { ListSkeleton } from './_components/list-skeleton';
import { PatientRecordHeaderActions } from './_components/patient-record-header-actions';
import { PrescriptionCard } from './_components/prescription-card';
import { QuickStat } from './_components/quick-stat';
import { StickyPatientBar } from './_components/sticky-patient-bar';
import { VitalTile } from './_components/vital-tile';
import { WritePrescriptionDialog } from './_components/write-prescription-dialog';
import { ageFrom, initialsFor, shortId } from './_lib/patient-display';

// Sized to StickyPatientBar's own rendered height (compact avatar + two text
// lines + padding) -- applied as scroll-margin-top on anchorable/focusable
// content below so the sticky bar (fixed at the viewport top once visible)
// never covers what a keyboard-Tab or same-page-anchor navigation lands on.
// This is the actual risk a sticky bar creates; it does not trap focus (a
// bar with no focusable elements of its own cannot).
const STICKY_BAR_SCROLL_MARGIN = 'scroll-mt-20';

const CERTAINTY_LEVELS = ['suspected', 'confirmed', 'ruled_out'] as const;
type CertaintyLevelValue = (typeof CERTAINTY_LEVELS)[number];

const DOCUMENT_PURPOSES: readonly DoctorPatientDocumentPurpose[] = ['clinical_attachment', 'lab_report'];

const CARD_CLASSNAME = 'rounded-2xl border-border-default/60 shadow-[0_10px_30px_rgba(15,23,42,0.05)]';

// Tabs -> URL (Phase 1.3): mirrors doctor/queue/page.tsx's exact pattern so
// `?tab=` is shareable/restorable the same way there, e.g. deep-linking
// straight to `?tab=consultations` from the Queue or Dashboard.
type TabValue = 'overview' | 'history' | 'consultations' | 'prescriptions' | 'documents';
const TAB_VALUES: readonly TabValue[] = ['overview', 'history', 'consultations', 'prescriptions', 'documents'];

/**
 * The Doctor Workspace's clinical patient chart -- reached from the
 * Patients list (`/doctor/patients` row action), an appointment, or a
 * consultation. Protected: `RequireRole(['doctor'])` here, plus a real
 * server-side doctor-patient relationship check on every `/doctor/patients/
 * :id/*` call (ClinicalModule's DoctorPatientChartController) -- a doctor
 * with no real appointment history with this patient gets the same
 * ownership-safe 404 as an unauthenticated caller, never a client-side-only
 * gate. DOCTOR-OWNED ENCOUNTERS ONLY: every clinical section below reflects
 * only this doctor's own encounters with this patient, never another
 * doctor's notes/prescriptions even if they've also treated the same
 * patient.
 */
export default function DoctorPatientChartPage() {
  const t = useTranslations('publicPatient');
  const format = useFormatter();
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const patientProfileId = params.id;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Observed by StickyPatientBar (IntersectionObserver) to know when the
  // real header has scrolled out of view.
  const headerRef = useRef<HTMLDivElement>(null);
  // Responsive pass (Phase 7): the chart tabs (`TabsList`) are a horizontally
  // scrollable pill row (`overflow-x-auto`, was already there) -- at 390px
  // 5 tabs measured ~678px wide in a ~348px viewport, so whichever tab is
  // active must be scrolled into view itself, not just reachable by manually
  // swiping. `tabsListRef` finds the currently `data-state="active"` trigger
  // inside the list and scrolls it into view on mount and on every tab
  // change (including the `?tab=` deep-link case, which previously could
  // land on an off-screen-active tab with no visual cue it was even
  // selected).

  const tabParam = searchParams.get('tab');
  const initialTab: TabValue = TAB_VALUES.includes(tabParam as TabValue) ? (tabParam as TabValue) : 'overview';
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  // Write Prescription (Phase 3.2, restructured Phase 3 UX remediation):
  // opens `WritePrescriptionDialog` against a past completed appointment's
  // ConsultationSession -- deliberately relies on SignPrescriptionUseCase's
  // own InProgress-or-Completed session-state check (Phase 3.3) rather than
  // this page re-deriving that rule. The dialog itself now owns appointment
  // selection/step state.
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);
  // Add Condition (Phase 6 UX remediation): same controlled-dialog shape as
  // Write Prescription above -- a single visible header trigger opens it
  // directly, regardless of which tab is active. See `AddConditionDialog`'s
  // own doc comment for why this replaced the old tab-scoped trigger.
  const [addConditionDialogOpen, setAddConditionDialogOpen] = useState(false);
  const tabsListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeTrigger = tabsListRef.current?.querySelector<HTMLElement>('[data-state="active"]');
    activeTrigger?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [activeTab]);

  // Shareable/restorable tab state (?tab=consultations), not just component
  // state that resets to Overview on every reload or shared link -- mirrors
  // doctor/queue/page.tsx's exact handleFilterChange pattern.
  function handleTabChange(next: TabValue) {
    setActiveTab(next);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('tab', next);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  const { data: profile, isLoading: profileLoading, error: profileError } = useDoctorPatientChartProfile(patientProfileId);
  const { data: appointments, isLoading: appointmentsLoading } = useDoctorPatientChartAppointments(patientProfileId);
  const { data: medicalRecords, isLoading: medicalRecordsLoading } = useDoctorPatientChartMedicalRecords(patientProfileId);
  const { data: prescriptions, isLoading: prescriptionsLoading } = useDoctorPatientChartPrescriptions(patientProfileId);
  const { data: documents, isLoading: documentsLoading } = useDoctorPatientChartDocuments(patientProfileId);
  const { data: vitals } = useDoctorPatientChartVitals(patientProfileId);

  const notFound = profileError instanceof ApiError && profileError.status === 404;

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      {profileLoading && (
        <Page>
          <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </Page>
      )}

      {!profileLoading && notFound && (
        <Page>
          <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} />
          <EmptyState title={t('notFoundTitle')} description={t('notFoundDescription')} />
        </Page>
      )}

      {!profileLoading && !notFound && (!profile || profileError) && (
        <Page>
          <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} />
          <Alert variant="danger">{t('loadError')}</Alert>
        </Page>
      )}

      {!profileLoading && profile && (() => {
        const age = profile.dateOfBirth ? ageFrom(profile.dateOfBirth) : undefined;
        const now = new Date();
        // Shared "upcoming" definition (Phase 1 UX remediation) --
        // see `isUpcomingAppointment`'s own doc comment for why this
        // moved out of a page-local `NON_TERMINAL_STATUSES` set.
        const isUpcoming = (appointment: DoctorPatientChartAppointment) => isUpcomingAppointment(appointment, now);
        // Medical-history entries have no chronic/active flag or category on
        // the backend (only `freeTextDescription` + an optional
        // `certaintyLevel`) -- see IMPLEMENTATION_NOTES.md Phase 0 (c).
        // Rather than infer chronicity from free text, this lists real
        // condition-type entries only (`type === 'condition'`, i.e. added
        // via "Add condition"), excluding visit notes, under an honestly
        // scoped title ("Conditions on record", not "Chronic conditions").
        const conditionEntries = (medicalRecords ?? []).filter((entry) => entry.type === 'condition');
        const upcomingAppointments = (appointments ?? [])
          .filter(isUpcoming)
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        const pastAppointments = (appointments ?? [])
          .filter((appointment) => !isUpcoming(appointment))
          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
        // Phase 2 (Appointment Visibility & Consultation History): a past
        // appointment stuck in a non-terminal status (nobody ever
        // cancelled/it was never resolved by the system's complete/no-show
        // sweeps) used to sit silently in "Previous visits" looking exactly
        // like a real completed visit. Split out here using the same shared
        // `NON_TERMINAL_APPOINTMENT_STATUSES` set `isUpcomingAppointment`
        // itself uses, so "needs resolution" can never disagree with
        // "upcoming" about the same appointment.
        const needsResolutionAppointments = pastAppointments.filter((appointment) =>
          NON_TERMINAL_APPOINTMENT_STATUSES.has(appointment.status),
        );
        const previousVisits = pastAppointments.filter(
          (appointment) => !NON_TERMINAL_APPOINTMENT_STATUSES.has(appointment.status),
        );
        const completedCount = pastAppointments.filter((appointment) => appointment.status === 'completed').length;
        const activePrescriptionsCount = (prescriptions ?? []).filter((prescription) => prescription.status === 'active').length;
        const lastVisit = pastAppointments.find((appointment) => appointment.status === 'completed');
        // Write Prescription session selection (Phase 3.2): any completed
        // appointment with a real ConsultationSession -- deliberately not
        // pre-filtered by "has a diagnosis" (no aggregate endpoint exists for
        // that); WritePrescriptionDialog's own empty state handles a session
        // with no diagnosis yet.
        const eligiblePrescriptionAppointments = (appointments ?? []).filter(
          (appointment): appointment is DoctorPatientChartAppointment & { consultationSessionId: string } =>
            appointment.status === 'completed' && appointment.consultationSessionId !== null,
        );
        function openPrescriptionDialog() {
          setPrescriptionDialogOpen(true);
        }
        function openAddConditionDialog() {
          setAddConditionDialogOpen(true);
        }

        return (
          <TooltipProvider>
          <Page>
            <WorkspaceHeader
              breadcrumbs={<AppBreadcrumbs />}
              title={profile.fullName}
              description={t('workspaceEyebrow')}
              actions={
                <PatientRecordHeaderActions
                  patientProfileId={patientProfileId}
                  hasUpcomingAppointment={upcomingAppointments.length > 0}
                  canWritePrescription={eligiblePrescriptionAppointments.length > 0}
                  onWritePrescription={openPrescriptionDialog}
                  onAddCondition={openAddConditionDialog}
                  onUploadDocument={() => handleTabChange('documents')}
                />
              }
            />

            {/* Patient Record Page P0 fix: appears once the real header
                below scrolls out of view, so the doctor never loses track of
                whose chart they're in while deep in a tab. */}
            <StickyPatientBar profile={profile} headerRef={headerRef} />

            <div className={cn('flex flex-col gap-6', STICKY_BAR_SCROLL_MARGIN)}>
              {/* Card isn't forwardRef -- wrap it instead of passing ref
                  through, so StickyPatientBar's IntersectionObserver has a
                  real DOM node to watch. */}
              <div ref={headerRef}>
              <Card
                className={cn('relative isolate overflow-hidden bg-gradient-to-br from-primary-subtle/40 to-surface', CARD_CLASSNAME)}
              >
                <div aria-hidden className="pointer-events-none absolute -end-14 -top-16 size-48 rounded-full bg-primary/10 blur-3xl" />
                <CardContent className="relative z-10 flex flex-wrap items-center gap-4 px-7 py-6">
                  <Avatar size="xl" className="shrink-0 ring-4 ring-surface/80">
                    {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.fullName} />}
                    <AvatarFallback className="bg-primary text-primary-foreground">{initialsFor(profile.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-text-secondary">
                      <span>{profile.gender ? t(`genderOptions.${profile.gender}`) : t('notOnRecord')}</span>
                      {age !== undefined && <span>· {t('ageYearsOld', { age })}</span>}
                      {profile.dateOfBirth && (
                        <span>
                          · {t('dateOfBirthLabel')}: {format.dateTime(new Date(profile.dateOfBirth), { dateStyle: 'medium' })}
                        </span>
                      )}
                    </p>
                    {/* De-emphasized (Phase 1.4): no MRN field exists in this
                        domain -- only this UUID, kept small/tertiary and
                        moved off its own line under the name so it reads as
                        a minor identifier, not a primary label. */}
                    <div className="flex items-center gap-1">
                      <bdi dir="ltr" className="text-xs text-text-tertiary">
                        {t('patientId', { id: shortId(profile.id) })}
                      </bdi>
                      <CopyButton value={profile.id} label={t('copyPatientId')} copiedLabel={t('copyPatientIdCopied')} />
                    </div>
                    {/* Page-level provenance (P1): the one timestamp this DTO
                        actually returns (profile.updatedAt) -- per-vital
                        "recorded by" would need a new recordedByDoctorId/name
                        field on DoctorPatientChartVitalSummary that doesn't
                        exist today; not faked here. */}
                    <p className="text-xs text-text-tertiary">
                      {t('lastUpdated', { relativeTime: formatRelativeTime(new Date(profile.updatedAt), locale, t('activeNow')) })}
                    </p>
                  </div>
                </CardContent>
              </Card>
              </div>

              {/* Allergy banner (P0 fix): full-width, color-coded, directly
                  under the identity header and above the stat tiles -- a
                  Tabs sibling, so it stays visible on every tab. */}
              <AllergyBanner profile={profile} patientProfileId={patientProfileId} />

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <QuickStat
                  label={t('stats.completedConsultations')}
                  value={String(completedCount)}
                  onClick={() => handleTabChange('consultations')}
                />
                <QuickStat
                  label={t('stats.upcomingAppointments')}
                  value={String(upcomingAppointments.length)}
                  onClick={() => handleTabChange('consultations')}
                />
                <QuickStat
                  label={t('stats.activePrescriptions')}
                  value={String(activePrescriptionsCount)}
                  onClick={() => handleTabChange('prescriptions')}
                />
                <QuickStat
                  label={t('stats.lastVisit')}
                  value={
                    lastVisit
                      ? format.dateTime(new Date(lastVisit.scheduledAt), { year: 'numeric', month: 'short', day: 'numeric' })
                      : t('stats.none')
                  }
                  onClick={() => handleTabChange('consultations')}
                />
              </div>

              {/* Conditions-on-record strip (Phase 1.5, retitled Phase 1 UX
                  remediation): a Tabs sibling, still visible on every tab --
                  allergies moved into its own P0 banner above, this is what's
                  left of the old combined strip. Previously showed the
                  patient's own self-reported `chronicDiseases` free-text
                  field (Patient Portal profile data, always empty for a
                  patient the doctor has actually treated) while the Medical
                  History tab below listed real condition entries this doctor
                  recorded -- now sources the same condition entries so the
                  two never disagree. */}
              <InfoTile
                icon={HeartPulse}
                iconClassName="bg-neutral-subtle text-neutral"
                label={t('conditionsOnRecord')}
                value={conditionEntries.length > 0 ? conditionEntries.map((entry) => entry.title).join(' · ') : t('noConditionsRecorded')}
              />

              {/* Heading-hierarchy fix (Phase 1.2): the workspace H1 above is
                  the patient's name and every card title (`CardTitle`) below
                  is a real H3 -- this sr-only H2 keeps the document outline
                  H1 -> H2 -> H3 with no skip, without changing the page's
                  visual design. */}
              <Heading level={2} className="sr-only">
                {t('clinicalRecordHeading')}
              </Heading>

              <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as TabValue)}>
                <TabsList
                  ref={tabsListRef}
                  className="max-w-full overflow-x-auto rounded-xl p-1.5 mask-[linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)]"
                >
                  <TabsTrigger value="overview" className="whitespace-nowrap rounded-lg px-4 py-3 data-[state=active]:text-primary">
                    {t('tabs.overview')}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="whitespace-nowrap rounded-lg px-4 py-3 data-[state=active]:text-primary">
                    {medicalRecords ? t('tabs.medicalHistoryCount', { count: medicalRecords.length }) : t('tabs.medicalHistory')}
                  </TabsTrigger>
                  <TabsTrigger value="consultations" className="whitespace-nowrap rounded-lg px-4 py-3 data-[state=active]:text-primary">
                    {appointments ? t('tabs.consultationsCount', { count: appointments.length }) : t('tabs.consultations')}
                  </TabsTrigger>
                  <TabsTrigger value="prescriptions" className="whitespace-nowrap rounded-lg px-4 py-3 data-[state=active]:text-primary">
                    {prescriptions ? t('tabs.prescriptionsCount', { count: prescriptions.length }) : t('tabs.prescriptions')}
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="whitespace-nowrap rounded-lg px-4 py-3 data-[state=active]:text-primary">
                    {documents ? t('tabs.documentsCount', { count: documents.length }) : t('tabs.documents')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card className={CARD_CLASSNAME}>
                      <CardHeader className="px-7 py-6">
                        <CardTitle>{t('personalInformation')}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4 px-7 pt-0 pb-7 text-sm">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2 text-text-secondary">
                            <Icon icon={Mail} size="sm" className="shrink-0" />
                            <a href={`mailto:${profile.email}`} className="min-w-0 wrap-break-word hover:underline">
                              {profile.email}
                            </a>
                            <CopyButton value={profile.email} label={t('copyEmail')} copiedLabel={t('copyEmailCopied')} />
                          </div>
                          <div className="flex items-center gap-2 text-text-secondary">
                            <Icon icon={Phone} size="sm" className="shrink-0" />
                            {profile.phoneNumber ? (
                              <>
                                <a href={`tel:${profile.phoneNumber}`} className="hover:underline" dir="ltr">
                                  {profile.phoneNumber}
                                </a>
                                <CopyButton value={profile.phoneNumber} label={t('copyPhone')} copiedLabel={t('copyPhoneCopied')} />
                              </>
                            ) : (
                              t('notOnRecord')
                            )}
                          </div>
                          {/* Address label (Phase 6 UX remediation): this
                              row used to be icon-only -- when there's no
                              address on record, "Not on record" with no
                              visible label reads as ambiguous to a sighted
                              user (unlike phone/email, whose own value
                              format makes the field obvious). A visible text
                              label fixes that without relying on the icon
                              alone or an aria-label nobody sighted can see. */}
                          <div className="flex items-center gap-2 text-text-secondary">
                            <Icon icon={MapPin} size="sm" className="shrink-0" />
                            <span className="text-xs text-text-tertiary">{t('addressLabel')}:</span>
                            {profile.address ?? t('notOnRecord')}
                          </div>
                        </div>

                        {/* Rebalance (P1): Emergency Contacts moved in here
                            from Medical Profile -- it's demographic/contact
                            data, not a clinical value, and Medical Profile
                            was visually much taller with it there. */}
                        <div className="border-t border-border-default pt-4">
                          <p className="mb-2 text-xs font-medium text-text-tertiary">{t('emergencyContacts')}</p>
                          {profile.emergencyContacts.length > 0 ? (
                            <ul className="flex flex-col gap-2">
                              {profile.emergencyContacts.map((contact) => (
                                <li key={contact.id} className="flex items-center gap-3 rounded-xl border border-border-default/70 p-3">
                                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary-emphasis">
                                    <Icon icon={Phone} size="sm" />
                                  </div>
                                  <div className="flex min-w-0 flex-col gap-0.5">
                                    <p className="text-sm font-medium text-text-primary">{contact.name}</p>
                                    <p className="text-sm text-text-secondary">
                                      {t(`relationshipOptions.${contact.relationship}`)} · {contact.phoneNumber}
                                    </p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <EmptyState icon={UserRoundPlus} title={t('noEmergencyContacts')} />
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className={CARD_CLASSNAME}>
                      <CardHeader className="px-7 py-6">
                        <CardTitle>{t('medicalProfile')}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4 px-7 pt-0 pb-7">
                        <div className="grid grid-cols-2 gap-3">
                          <InfoTile
                            icon={Droplet}
                            iconClassName="bg-danger-subtle text-danger"
                            label={t('bloodType')}
                            value={profile.bloodType ?? t('notOnRecord')}
                          />
                          <InfoTile
                            icon={Shield}
                            iconClassName="bg-primary-subtle text-primary-emphasis"
                            label={t('insurance')}
                            value={profile.insuranceProviderName ?? t('insuranceSelfPay')}
                          />
                          {/* Vitals (P0 fix): date, staleness, non-diagnostic
                              range flag (BP/glucose only), and a neutral
                              trend -- see VitalTile for the full rationale.
                              An honest "not on record" fallback when this
                              doctor has never recorded one, same as every
                              tile above. */}
                          <VitalTile
                            icon={Scale}
                            iconClassName="bg-primary-subtle text-primary-emphasis"
                            label={t('latestWeight')}
                            summary={vitals?.find((summary) => summary.type === 'weight')}
                            notOnRecordLabel={t('notOnRecord')}
                          />
                          <VitalTile
                            icon={Activity}
                            iconClassName="bg-danger-subtle text-danger"
                            label={t('latestBloodPressure')}
                            summary={vitals?.find((summary) => summary.type === 'blood-pressure')}
                            notOnRecordLabel={t('notOnRecord')}
                          />
                          <VitalTile
                            icon={Droplets}
                            iconClassName="bg-warning-subtle text-warning-emphasis"
                            label={t('latestBloodSugar')}
                            summary={vitals?.find((summary) => summary.type === 'blood-sugar')}
                            notOnRecordLabel={t('notOnRecord')}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="history">
                  <Card className={CARD_CLASSNAME}>
                    <CardHeader className="px-7 py-6">
                      {/* "Add condition" trigger removed from here (Phase 6 UX
                          remediation) -- it's now the single visible header
                          button (see PatientRecordHeaderActions), which opens
                          the same `AddConditionDialog` rendered below
                          regardless of which tab is active. */}
                      <CardTitle>{t('medicalHistory')}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-7 pt-0 pb-7">
                      {medicalRecordsLoading && <ListSkeleton />}
                      {!medicalRecordsLoading && (medicalRecords?.length ?? 0) === 0 && (
                        <EmptyState icon={ClipboardList} title={t('noMedicalHistory')} />
                      )}
                      {!medicalRecordsLoading && medicalRecords && medicalRecords.length > 0 && (
                        <ol className="flex flex-col gap-4">
                          {medicalRecords.map((entry: DoctorPatientChartMedicalRecordEntry) => (
                            <li key={entry.id} className="flex gap-3 border-s-2 border-border-default ps-4">
                              <div className="flex flex-1 flex-col gap-0.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {/* Type label (Phase 6 UX remediation): the
                                        real `type` discriminator this DTO
                                        already carries (used since Phase 1 for
                                        the "Conditions on record" strip)
                                        wasn't surfaced here -- a "Clinical
                                        visit" free-text note and a real
                                        condition entry looked identical. */}
                                    <Badge variant={entry.type === 'condition' ? 'primary' : 'neutral'} className="text-[10px]">
                                      {t(`medicalHistoryEntryType.${entry.type}`)}
                                    </Badge>
                                    <p className="text-sm font-medium text-text-primary">{entry.title}</p>
                                  </div>
                                  <span className="text-xs text-text-tertiary">
                                    {format.dateTime(new Date(entry.date), { dateStyle: 'medium' })}
                                  </span>
                                </div>
                                {entry.description && <p className="text-sm text-text-secondary">{entry.description}</p>}
                                {entry.doctorName && <p className="text-xs text-text-tertiary">{t('by', { name: entry.doctorName })}</p>}
                              </div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="consultations" className="flex flex-col gap-6">
                  <Card className={CARD_CLASSNAME}>
                    <CardHeader className="px-7 py-6">
                      <CardTitle>{t('upcomingAppointments')}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-7 pt-0 pb-7">
                      {appointmentsLoading && <ListSkeleton rows={2} />}
                      {!appointmentsLoading && upcomingAppointments.length === 0 && (
                        <EmptyState icon={CalendarDays} title={t('noUpcomingAppointments')} />
                      )}
                      {!appointmentsLoading && upcomingAppointments.length > 0 && (
                        <ul className="flex flex-col gap-3">
                          {upcomingAppointments.map((appointment) => (
                            <AppointmentRow key={appointment.id} appointment={appointment} />
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  {/* Needs resolution (Phase 2): a past-dated appointment
                      nobody ever resolved -- per IMPLEMENTATION_NOTES.md's
                      Phase 0 finding (b), complete()/markNoShow() are
                      system-only, so the only real doctor action here is
                      Cancel (CancelAppointmentDialog explains why). Only
                      rendered once appointments have loaded and there's
                      something real to flag -- no empty-state noise on a
                      patient with a perfectly clean history. */}
                  {!appointmentsLoading && needsResolutionAppointments.length > 0 && (
                    <Card className={CARD_CLASSNAME}>
                      <CardHeader className="px-7 py-6">
                        <CardTitle>{t('needsResolution.title')}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3 px-7 pt-0 pb-7">
                        <p className="text-sm text-text-secondary">{t('needsResolution.description')}</p>
                        <ul className="flex flex-col gap-3">
                          {needsResolutionAppointments.map((appointment) => (
                            <AppointmentRow key={appointment.id} appointment={appointment} showCancel />
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  <Card className={CARD_CLASSNAME}>
                    <CardHeader className="px-7 py-6">
                      <CardTitle>{t('previousVisits')}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-7 pt-0 pb-7">
                      {appointmentsLoading && <ListSkeleton rows={2} />}
                      {!appointmentsLoading && previousVisits.length === 0 && (
                        <EmptyState icon={Stethoscope} title={t('noPreviousVisits')} />
                      )}
                      {!appointmentsLoading && previousVisits.length > 0 && (
                        <ul className="flex flex-col gap-3">
                          {previousVisits.map((appointment) => (
                            <AppointmentRow key={appointment.id} appointment={appointment} />
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="prescriptions">
                  <Card className={CARD_CLASSNAME}>
                    <CardHeader className="px-7 py-6">
                      {/* "Write prescription" trigger removed from here
                          (Phase 6 UX remediation) -- it's now the single
                          visible header button (see
                          PatientRecordHeaderActions), which opens the same
                          `WritePrescriptionDialog` rendered below regardless
                          of which tab is active. */}
                      <CardTitle>{t('prescriptions')}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-7 pt-0 pb-7">
                      {prescriptionsLoading && <ListSkeleton />}
                      {!prescriptionsLoading && (prescriptions?.length ?? 0) === 0 && (
                        <EmptyState icon={Pill} title={t('noPrescriptions')} />
                      )}
                      {!prescriptionsLoading && prescriptions && prescriptions.length > 0 && (
                        <ul className="flex flex-col gap-3">
                          {prescriptions.map((prescription: DoctorPatientChartPrescription) => (
                            <PrescriptionCard key={prescription.id} prescription={prescription} />
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="documents">
                  <Card className={CARD_CLASSNAME}>
                    <CardHeader className="flex flex-row items-center justify-between gap-3 px-7 py-6">
                      <CardTitle>{t('documents')}</CardTitle>
                      <UploadDocumentControl patientProfileId={patientProfileId} />
                    </CardHeader>
                    <CardContent className="px-7 pt-0 pb-7">
                      {documentsLoading && <ListSkeleton />}
                      {!documentsLoading && (documents?.length ?? 0) === 0 && (
                        <EmptyState icon={FileText} title={t('noDocuments')} />
                      )}
                      {!documentsLoading && documents && documents.length > 0 && (
                        <ul className="flex flex-col gap-3">
                          {documents.map((document) => (
                            <li
                              key={document.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-border-default/70 p-4"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary-emphasis">
                                  <Icon icon={FileText} size="sm" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-text-primary">{t(`documentPurpose.${document.purpose}`)}</p>
                                  <p className="text-xs text-text-tertiary">
                                    {format.dateTime(new Date(document.createdAt), { dateStyle: 'medium' })}
                                  </p>
                                </div>
                              </div>
                              {document.signedUrl && (
                                <a
                                  href={document.signedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-primary hover:underline"
                                >
                                  {t('view')}
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Write Prescription / Add Condition dialogs (Phase 6 UX
                  remediation): moved out from inside their own
                  `TabsContent` -- Radix unmounts inactive tab content by
                  default, so a dialog nested inside one tab's content
                  couldn't be opened by the new header-level trigger while a
                  different tab was active. Rendered here, as `Tabs`
                  siblings, so both dialogs are always mounted and open
                  correctly regardless of which tab the doctor is on. */}
              <WritePrescriptionDialog
                profile={profile}
                patientProfileId={patientProfileId}
                eligibleAppointments={eligiblePrescriptionAppointments}
                open={prescriptionDialogOpen}
                onOpenChange={setPrescriptionDialogOpen}
              />
              <AddConditionDialog
                patientProfileId={patientProfileId}
                open={addConditionDialogOpen}
                onOpenChange={setAddConditionDialogOpen}
              />

              {/* Recent feedback removed (Phase 6 UX remediation): the
                  patient's own star review of this doctor is social
                  proof/vanity, not clinical data -- it doesn't belong inside
                  a patient's clinical chart at all (previously shown below
                  the tabs, visible on every tab). The doctor's reviews
                  already live on their own Profile page
                  (`features/consultation/components/doctor-reviews-list.tsx`)
                  -- no data was moved or deleted, this chart just stops
                  rendering it. */}
            </div>
          </Page>
          </TooltipProvider>
        );
      })()}
    </RequireRole>
  );
}

// Add condition (Phase 4.1): a doctor-authored condition entry added
// directly from the chart, outside any consultation session.
//
// Phase 6 UX remediation: this used to own its own `DialogTrigger` button,
// rendered only inside the Medical History tab's `CardHeader` -- reachable
// only after navigating to that tab. Now controlled (`open`/`onOpenChange`
// props, same shape as `WritePrescriptionDialog`) so the single visible
// "Add condition" trigger lives in the workspace header
// (`PatientRecordHeaderActions`) and opens this dialog directly regardless
// of which tab is active, instead of two separately-rendered buttons with
// the same accessible name existing at once.
function AddConditionDialog({
  patientProfileId,
  open,
  onOpenChange,
}: {
  patientProfileId: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const t = useTranslations('publicPatient');
  const [description, setDescription] = useState('');
  const [certaintyLevel, setCertaintyLevel] = useState<CertaintyLevelValue>('suspected');
  const addCondition = useAddPatientCondition(patientProfileId);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setDescription('');
      setCertaintyLevel('suspected');
      addCondition.reset();
    }
  }

  function handleSave() {
    const trimmed = description.trim();
    if (!trimmed) return;
    addCondition.mutate(
      { freeTextDescription: trimmed, certaintyLevel },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('addConditionDialogTitle')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="condition-description" className="text-sm font-medium text-text-primary">
              {t('conditionDescriptionLabel')}
            </label>
            <Textarea
              id="condition-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('conditionDescriptionPlaceholder')}
              className="min-h-20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="condition-certainty" className="text-sm font-medium text-text-primary">
              {t('certaintyLevelLabel')}
            </label>
            <Select value={certaintyLevel} onValueChange={(value) => setCertaintyLevel(value as CertaintyLevelValue)}>
              <SelectTrigger id="condition-certainty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CERTAINTY_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {t(`certaintyLevelOptions.${level}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {addCondition.isError && <Alert variant="danger">{t('addConditionError')}</Alert>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
              {t('cancelDeclineAppointment')}
            </Button>
            <Button type="button" size="sm" loading={addCondition.isPending} disabled={!description.trim()} onClick={handleSave}>
              {t('saveCondition')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Document upload (Phase 4.2): purpose selector limited to the two clinical
// purposes, file picker, progress -- reuses the same upload-intent -> PUT ->
// confirm flow the self-upload flows use, wired to the doctor-only routes.
function UploadDocumentControl({ patientProfileId }: { patientProfileId: string }) {
  const t = useTranslations('publicPatient');
  const inputRef = useRef<HTMLInputElement>(null);
  const [purpose, setPurpose] = useState<DoctorPatientDocumentPurpose>('clinical_attachment');
  const upload = useUploadPatientDocument(patientProfileId);

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    upload.mutate({ file, purpose });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={purpose} onValueChange={(value) => setPurpose(value as DoctorPatientDocumentPurpose)}>
        <SelectTrigger className="w-44" aria-label={t('uploadDocumentPurposeLabel')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DOCUMENT_PURPOSES.map((option) => (
            <SelectItem key={option} value={option}>
              {t(`documentPurpose.${option}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input ref={inputRef} type="file" className="hidden" onChange={handleFileSelected} />
      <Button type="button" variant="outline" size="sm" loading={upload.isPending} onClick={() => inputRef.current?.click()}>
        <Icon icon={Upload} size="sm" />
        {t('uploadDocument')}
      </Button>
      {upload.isError && <Alert variant="danger">{t('uploadDocumentError')}</Alert>}
    </div>
  );
}

// Consultations tab (Phase 1.6): the doctor's own name/specialization used
// to be shown back to themselves here, which is pointless -- this doctor
// already knows who they are. Shows the actual clinically useful fields
// instead: reason for visit, consultation type (free/paid -- there is no
// "booking channel" concept anywhere in this domain), and duration when the
// appointment's endTime is known.
// Audit finding #4 (the reason Phase 2 of this page's plan exists): the
// doctor previously had no way to approve/decline a pending request from
// the patient's own chart, only from the separate Queue page. Reuses the
// exact same hooks the Queue's PendingApprovalSection uses, so approving/
// declining here invalidates the same caches (Queue/Dashboard/Pending
// Approval/this chart's own appointments) either surface was already
// wired to.
function AppointmentRow({ appointment, showCancel = false }: { appointment: DoctorPatientChartAppointment; showCancel?: boolean }) {
  const t = useTranslations('publicPatient');
  const format = useFormatter();
  const approveAppointment = useApproveAppointment();
  const declineAppointment = useDeclineAppointment();
  const [isDeclining, setIsDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const durationMinutes = appointment.endTime ? getDurationMinutes(appointment.scheduledAt, appointment.endTime) : undefined;
  const isPending = appointment.status === 'requested';

  function submitDecline() {
    declineAppointment.mutate(
      { appointmentId: appointment.id, reason: declineReason.trim() || undefined },
      { onSuccess: () => setIsDeclining(false) },
    );
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border-default/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-text-primary">
          {format.dateTime(new Date(appointment.scheduledAt), { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
        <AppointmentStatusBadge status={appointment.status} />
      </div>
      <p className="text-sm text-text-secondary">{appointment.reasonForVisit ?? t('reasonForVisitFallback')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral">{t(`consultationType.${appointment.consultationType}`)}</Badge>
        {durationMinutes !== undefined && (
          <span className="text-xs text-text-tertiary">{t('durationMinutes', { minutes: durationMinutes })}</span>
        )}
      </div>

      {/* Consultation summary (Phase 2): a completed visit's real SOAP
          notes/diagnoses/prescriptions, reachable at last -- previously
          "Previous visits" cards weren't clickable at all. A completed
          appointment with no ConsultationSession (defensive -- Confirmed
          appointments always get one at confirmation time) gets an honest
          "no summary" note instead of a dead button. */}
      {appointment.status === 'completed' && (
        <div>
          {appointment.consultationSessionId ? (
            <DoctorConsultationSummaryAction
              consultationSessionId={appointment.consultationSessionId}
              triggerLabel={t('viewConsultationSummary')}
            />
          ) : (
            <p className="text-xs text-text-tertiary">{t('noConsultationSummary')}</p>
          )}
        </div>
      )}

      {/* Needs resolution (Phase 2): the only real doctor action on a
          past-dated non-terminal appointment -- see CancelAppointmentDialog's
          own comment for why Complete/No-show aren't offered here. */}
      {showCancel && (
        <div className="border-t border-border-default pt-3">
          <CancelAppointmentDialog appointmentId={appointment.id} willRefund={appointment.status === 'confirmed'} />
        </div>
      )}

      {isPending && (
        <div className="flex flex-col gap-2 border-t border-border-default pt-3">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={declineAppointment.isPending}
              onClick={() => setIsDeclining((prev) => !prev)}
            >
              {t('declineAppointment')}
            </Button>
            <Button
              type="button"
              size="sm"
              loading={approveAppointment.isPending}
              onClick={() => approveAppointment.mutate(appointment.id)}
            >
              {t('approveAppointment')}
            </Button>
          </div>

          {isDeclining && (
            <div className="flex flex-col gap-2">
              <label htmlFor={`chart-decline-reason-${appointment.id}`} className="text-xs font-medium text-text-tertiary">
                {t('declineReasonLabel')}
              </label>
              <Textarea
                id={`chart-decline-reason-${appointment.id}`}
                value={declineReason}
                onChange={(event) => setDeclineReason(event.target.value)}
                placeholder={t('declineReasonPlaceholder')}
                className="min-h-16"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsDeclining(false)}>
                  {t('cancelDeclineAppointment')}
                </Button>
                <Button type="button" variant="danger" size="sm" loading={declineAppointment.isPending} onClick={submitDecline}>
                  {t('confirmDeclineAppointment')}
                </Button>
              </div>
            </div>
          )}

          {approveAppointment.isError && <Alert variant="danger">{t('approveAppointmentError')}</Alert>}
          {declineAppointment.isError && <Alert variant="danger">{t('declineAppointmentError')}</Alert>}
        </div>
      )}
    </li>
  );
}
