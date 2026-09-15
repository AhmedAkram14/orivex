'use client';

import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Droplet,
  Droplets,
  FileText,
  Flower2,
  HeartPulse,
  Mail,
  MapPin,
  Phone,
  Pill,
  Plus,
  Scale,
  Shield,
  Star,
  Stethoscope,
  Upload,
  UserRoundPlus,
  type LucideIcon,
} from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { useDoctorReviews } from '@/features/consultation/hooks/use-doctor-reviews';
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
import { useDoctorProfile } from '@/features/doctor/hooks/use-doctor-profile';
import { useAddPatientCondition } from '@/features/doctor/hooks/use-add-patient-condition';
import { useConfirmNoKnownAllergies } from '@/features/doctor/hooks/use-confirm-no-known-allergies';
import { useUploadPatientDocument } from '@/features/doctor/hooks/use-upload-patient-document';
import { PrescriptionPanel } from '@/features/consultation/components/prescription-panel';
import { RequireRole } from '@/shared/auth/require-role';
import { Alert } from '@/shared/ui/alert';
import { ApiError } from '@/shared/lib/api/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Badge, type BadgeProps } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/icons/icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Heading } from '@/design-system/typography';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Page } from '@/shared/ui/layout/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Textarea } from '@/shared/ui/textarea';
import { usePathname, useRouter } from '@/shared/i18n/navigation';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';
import { cn } from '@/shared/lib/cn';
import type {
  DoctorPatientChartAppointment,
  DoctorPatientChartMedicalRecordEntry,
  DoctorPatientChartPrescription,
  DoctorPatientChartProfile,
  DoctorPatientDocumentPurpose,
} from '@/features/doctor/api/types';

const CERTAINTY_LEVELS = ['suspected', 'confirmed', 'ruled_out'] as const;
type CertaintyLevelValue = (typeof CERTAINTY_LEVELS)[number];

const DOCUMENT_PURPOSES: readonly DoctorPatientDocumentPurpose[] = ['clinical_attachment', 'lab_report'];

const CARD_CLASSNAME = 'rounded-2xl border-border-default/60 shadow-[0_10px_30px_rgba(15,23,42,0.05)]';

const NON_TERMINAL_STATUSES = new Set(['requested', 'confirmed', 'rescheduled']);

// Tabs -> URL (Phase 1.3): mirrors doctor/queue/page.tsx's exact pattern so
// `?tab=` is shareable/restorable the same way there, e.g. deep-linking
// straight to `?tab=consultations` from the Queue or Dashboard.
type TabValue = 'overview' | 'history' | 'consultations' | 'prescriptions' | 'documents';
const TAB_VALUES: readonly TabValue[] = ['overview', 'history', 'consultations', 'prescriptions', 'documents'];

/** A human-shaped stand-in for the real UUID (never truncated/altered anywhere it's actually used for a lookup -- display only, this page's own header). Matches the short-SHA convention: first 8 hex characters, uppercased. */
function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

function ageFrom(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

const appointmentBadgeVariant: Record<DoctorPatientChartAppointment['status'], NonNullable<BadgeProps['variant']>> = {
  requested: 'neutral',
  confirmed: 'success',
  rescheduled: 'info',
  completed: 'primary',
  cancelled: 'danger',
  no_show: 'danger',
};

const prescriptionBadgeVariant: Record<DoctorPatientChartPrescription['status'], NonNullable<BadgeProps['variant']>> = {
  active: 'success',
  expired: 'neutral',
};

interface InfoTileProps {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string;
}

function InfoTile({ icon, iconClassName, label, value }: InfoTileProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-default/70 bg-surface p-3">
      <div className={cn('flex size-8 items-center justify-center rounded-lg', iconClassName)}>
        <Icon icon={icon} size="sm" />
      </div>
      <div>
        <p className="text-xs text-text-tertiary">{label}</p>
        <p className="text-sm font-medium text-text-primary">{value}</p>
      </div>
    </div>
  );
}

interface QuickStatProps {
  label: string;
  value: string;
}

function QuickStat({ label, value }: QuickStatProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border-default/70 bg-surface px-4 py-3">
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="text-lg font-semibold text-text-primary">{value}</p>
    </div>
  );
}

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
  const params = useParams<{ id: string }>();
  const patientProfileId = params.id;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const initialTab: TabValue = TAB_VALUES.includes(tabParam as TabValue) ? (tabParam as TabValue) : 'overview';
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  // Write Prescription (Phase 3.2): opens PrescriptionPanel (extracted in
  // Phase 3.1 for exactly this reuse) against a past completed appointment's
  // ConsultationSession -- deliberately relies on SignPrescriptionUseCase's
  // own InProgress-or-Completed session-state check (Phase 3.3) rather than
  // this page re-deriving that rule.
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);
  const [selectedPrescriptionAppointmentId, setSelectedPrescriptionAppointmentId] = useState('');

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
  // Recent Feedback: reuses the doctor's own real reviews (GET
  // /doctors/:id/reviews, already public/authorized for this doctor to read)
  // filtered to the one patient this chart is for -- the same source the
  // review click-through itself came from, never a second fabricated feed.
  const { data: myDoctorProfile } = useDoctorProfile();
  const { data: doctorReviews } = useDoctorReviews(myDoctorProfile?.id);
  const reviewsForThisPatient = (doctorReviews?.reviews ?? [])
    .filter((review) => review.patientProfileId === patientProfileId && review.comment)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
        // "Upcoming" means genuinely still ahead of us -- a non-terminal
        // (Requested/Confirmed/Rescheduled) appointment whose own date has
        // already passed is stale, not upcoming, regardless of whether it
        // was ever formally resolved. Previously this bucketed on status
        // alone, so a Requested appointment days in the past (nobody ever
        // approved or declined it) stayed "upcoming" forever -- the same
        // fact DoctorAppointmentsController's nextAppointmentAt already got
        // right (it requires scheduledAt in the future too), which is why
        // this page and the Patients list used to disagree about the exact
        // same appointment.
        const isUpcoming = (appointment: DoctorPatientChartAppointment) =>
          NON_TERMINAL_STATUSES.has(appointment.status) && new Date(appointment.scheduledAt) > now;
        const upcomingAppointments = (appointments ?? [])
          .filter(isUpcoming)
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        const pastAppointments = (appointments ?? [])
          .filter((appointment) => !isUpcoming(appointment))
          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
        const completedCount = pastAppointments.filter((appointment) => appointment.status === 'completed').length;
        const activePrescriptionsCount = (prescriptions ?? []).filter((prescription) => prescription.status === 'active').length;
        const lastVisit = pastAppointments.find((appointment) => appointment.status === 'completed');
        // Write Prescription session selection (Phase 3.2): any completed
        // appointment with a real ConsultationSession -- deliberately not
        // pre-filtered by "has a diagnosis" (no aggregate endpoint exists for
        // that); PrescriptionPanel's own empty state handles a session with
        // no diagnosis yet.
        const eligiblePrescriptionAppointments = (appointments ?? []).filter(
          (appointment): appointment is DoctorPatientChartAppointment & { consultationSessionId: string } =>
            appointment.status === 'completed' && appointment.consultationSessionId !== null,
        );
        const selectedPrescriptionAppointment = eligiblePrescriptionAppointments.find(
          (appointment) => appointment.id === selectedPrescriptionAppointmentId,
        );

        function openPrescriptionDialog() {
          setPrescriptionDialogOpen(true);
          if (eligiblePrescriptionAppointments.length === 1) {
            setSelectedPrescriptionAppointmentId(eligiblePrescriptionAppointments[0].id);
          }
        }

        function handlePrescriptionDialogOpenChange(open: boolean) {
          setPrescriptionDialogOpen(open);
          if (!open) {
            setSelectedPrescriptionAppointmentId('');
          }
        }

        return (
          <Page>
            <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={profile.fullName} description={t('workspaceEyebrow')} />

            <div className="flex flex-col gap-6">
              <Card className={cn('relative isolate overflow-hidden bg-gradient-to-br from-primary-subtle/40 to-surface', CARD_CLASSNAME)}>
                <div aria-hidden className="pointer-events-none absolute -end-14 -top-16 size-48 rounded-full bg-primary/10 blur-3xl" />
                <CardContent className="relative z-10 flex flex-col gap-5 px-7 py-6">
                  <div className="flex flex-wrap items-center gap-4">
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
                      <p className="text-xs text-text-tertiary">{t('patientId', { id: shortId(profile.id) })}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <QuickStat label={t('stats.completedConsultations')} value={String(completedCount)} />
                    <QuickStat label={t('stats.upcomingAppointments')} value={String(upcomingAppointments.length)} />
                    <QuickStat label={t('stats.activePrescriptions')} value={String(activePrescriptionsCount)} />
                    <QuickStat
                      label={t('stats.lastVisit')}
                      value={
                        lastVisit
                          ? format.dateTime(new Date(lastVisit.scheduledAt), { year: 'numeric', month: 'short', day: 'numeric' })
                          : t('stats.none')
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {reviewsForThisPatient.length > 0 && (
                <Card className={CARD_CLASSNAME}>
                  <CardContent className="flex flex-col gap-2 px-6 py-5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">{t('recentFeedback')}</p>
                      <div className="flex items-center gap-0.5" aria-label={`${reviewsForThisPatient[0].rating}/5`}>
                        {Array.from({ length: 5 }, (_, index) => (
                          <Icon
                            key={index}
                            icon={Star}
                            size="sm"
                            className={cn(index < reviewsForThisPatient[0].rating ? 'fill-warning text-warning' : 'text-border-strong')}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary">&ldquo;{reviewsForThisPatient[0].comment}&rdquo;</p>
                    <p className="text-xs text-text-tertiary">
                      {format.dateTime(new Date(reviewsForThisPatient[0].createdAt), { dateStyle: 'medium' })}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Persistent allergy/condition strip (Phase 1.5): a sibling of
                  Tabs, not inside any TabsContent, so it stays visible no
                  matter which tab the doctor is on -- the two Overview-tab
                  InfoTiles for the same fields are removed below so this
                  isn't a duplicate. Phase 4.3: three real states -- has
                  allergies / confirmed none / not yet asked -- the last one
                  is the only one that shows the confirm action. */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <AllergyTile profile={profile} patientProfileId={patientProfileId} />
                <InfoTile
                  icon={HeartPulse}
                  iconClassName="bg-neutral-subtle text-neutral"
                  label={t('chronicConditions')}
                  value={profile.chronicDiseases || t('noConditionsOnRecord')}
                />
              </div>

              {/* Heading-hierarchy fix (Phase 1.2): the workspace H1 above is
                  the patient's name and every card title (`CardTitle`) below
                  is a real H3 -- this sr-only H2 keeps the document outline
                  H1 -> H2 -> H3 with no skip, without changing the page's
                  visual design. */}
              <Heading level={2} className="sr-only">
                {t('clinicalRecordHeading')}
              </Heading>

              <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as TabValue)}>
                <TabsList className="max-w-full overflow-x-auto rounded-xl p-1.5">
                  <TabsTrigger value="overview" className="whitespace-nowrap rounded-lg px-4 py-3 data-[state=active]:text-primary">
                    {t('tabs.overview')}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="whitespace-nowrap rounded-lg px-4 py-3 data-[state=active]:text-primary">
                    {t('tabs.medicalHistory')}
                  </TabsTrigger>
                  <TabsTrigger value="consultations" className="whitespace-nowrap rounded-lg px-4 py-3 data-[state=active]:text-primary">
                    {t('tabs.consultations')}
                  </TabsTrigger>
                  <TabsTrigger value="prescriptions" className="whitespace-nowrap rounded-lg px-4 py-3 data-[state=active]:text-primary">
                    {t('tabs.prescriptions')}
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="whitespace-nowrap rounded-lg px-4 py-3 data-[state=active]:text-primary">
                    {t('tabs.documents')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card className={CARD_CLASSNAME}>
                      <CardHeader className="px-7 py-6">
                        <CardTitle>{t('personalInformation')}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3 px-7 pt-0 pb-7 text-sm">
                        <div className="flex items-center gap-2 text-text-secondary">
                          <Icon icon={Mail} size="sm" className="shrink-0" />
                          <span className="min-w-0 wrap-break-word">{profile.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-text-secondary">
                          <Icon icon={Phone} size="sm" className="shrink-0" />
                          {profile.phoneNumber ?? t('notOnRecord')}
                        </div>
                        <div className="flex items-center gap-2 text-text-secondary">
                          <Icon icon={MapPin} size="sm" className="shrink-0" />
                          {profile.address ?? t('notOnRecord')}
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
                          {/* Real Clinical Vitals Demo pass: latest of each type this doctor
                              recorded, from GET :id/vitals -- an honest "not on record" fallback
                              when this doctor has never recorded one, same as every tile above. */}
                          <InfoTile
                            icon={Scale}
                            iconClassName="bg-primary-subtle text-primary-emphasis"
                            label={t('latestWeight')}
                            value={vitals?.find((summary) => summary.type === 'weight')?.latest?.valueLabel ?? t('notOnRecord')}
                          />
                          <InfoTile
                            icon={Activity}
                            iconClassName="bg-danger-subtle text-danger"
                            label={t('latestBloodPressure')}
                            value={vitals?.find((summary) => summary.type === 'blood-pressure')?.latest?.valueLabel ?? t('notOnRecord')}
                          />
                          <InfoTile
                            icon={Droplets}
                            iconClassName="bg-warning-subtle text-warning-emphasis"
                            label={t('latestBloodSugar')}
                            value={vitals?.find((summary) => summary.type === 'blood-sugar')?.latest?.valueLabel ?? t('notOnRecord')}
                          />
                        </div>

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
                  </div>
                </TabsContent>

                <TabsContent value="history">
                  <Card className={CARD_CLASSNAME}>
                    <CardHeader className="flex flex-row items-center justify-between gap-3 px-7 py-6">
                      <CardTitle>{t('medicalHistory')}</CardTitle>
                      <AddConditionButton patientProfileId={patientProfileId} />
                    </CardHeader>
                    <CardContent className="px-7 pt-0 pb-7">
                      {medicalRecordsLoading && <Skeleton className="h-32 w-full" />}
                      {!medicalRecordsLoading && (medicalRecords?.length ?? 0) === 0 && (
                        <EmptyState icon={ClipboardList} title={t('noMedicalHistory')} />
                      )}
                      {!medicalRecordsLoading && medicalRecords && medicalRecords.length > 0 && (
                        <ol className="flex flex-col gap-4">
                          {medicalRecords.map((entry: DoctorPatientChartMedicalRecordEntry) => (
                            <li key={entry.id} className="flex gap-3 border-s-2 border-border-default ps-4">
                              <div className="flex flex-1 flex-col gap-0.5">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-text-primary">{entry.title}</p>
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
                      {appointmentsLoading && <Skeleton className="h-24 w-full" />}
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

                  <Card className={CARD_CLASSNAME}>
                    <CardHeader className="px-7 py-6">
                      <CardTitle>{t('previousVisits')}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-7 pt-0 pb-7">
                      {appointmentsLoading && <Skeleton className="h-24 w-full" />}
                      {!appointmentsLoading && pastAppointments.length === 0 && (
                        <EmptyState icon={Stethoscope} title={t('noPreviousVisits')} />
                      )}
                      {!appointmentsLoading && pastAppointments.length > 0 && (
                        <ul className="flex flex-col gap-3">
                          {pastAppointments.map((appointment) => (
                            <AppointmentRow key={appointment.id} appointment={appointment} />
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="prescriptions">
                  <Card className={CARD_CLASSNAME}>
                    <CardHeader className="flex flex-row items-center justify-between gap-3 px-7 py-6">
                      <CardTitle>{t('prescriptions')}</CardTitle>
                      {eligiblePrescriptionAppointments.length > 0 && (
                        <Button type="button" size="sm" onClick={openPrescriptionDialog}>
                          {t('writePrescription')}
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="px-7 pt-0 pb-7">
                      {prescriptionsLoading && <Skeleton className="h-24 w-full" />}
                      {!prescriptionsLoading && (prescriptions?.length ?? 0) === 0 && (
                        <EmptyState icon={Pill} title={t('noPrescriptions')} />
                      )}
                      {!prescriptionsLoading && prescriptions && prescriptions.length > 0 && (
                        <ul className="flex flex-col gap-3">
                          {prescriptions.map((prescription: DoctorPatientChartPrescription) => (
                            <li key={prescription.id} className="flex flex-col gap-1 rounded-xl border border-border-default/70 p-4">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-text-primary">{prescription.medicationName}</p>
                                <Badge variant={prescriptionBadgeVariant[prescription.status]}>
                                  {t(`prescriptionStatus.${prescription.status}`)}
                                </Badge>
                              </div>
                              <p className="text-sm text-text-secondary">
                                {prescription.dosageAmount}, {prescription.frequencyLabel}
                              </p>
                              {prescription.instructions && <p className="text-sm text-text-secondary">{prescription.instructions}</p>}
                              <p className="text-xs text-text-tertiary">
                                {t('by', { name: prescription.prescribedBy })} ·{' '}
                                {format.dateTime(new Date(prescription.prescribedAt), { dateStyle: 'medium' })}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  <Dialog open={prescriptionDialogOpen} onOpenChange={handlePrescriptionDialogOpenChange}>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{t('writePrescriptionDialogTitle')}</DialogTitle>
                      </DialogHeader>

                      {eligiblePrescriptionAppointments.length > 1 && (
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="prescription-appointment-select" className="text-sm font-medium text-text-primary">
                            {t('selectPastAppointmentLabel')}
                          </label>
                          <Select value={selectedPrescriptionAppointmentId} onValueChange={setSelectedPrescriptionAppointmentId}>
                            <SelectTrigger id="prescription-appointment-select">
                              <SelectValue placeholder={t('selectPastAppointmentPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                              {eligiblePrescriptionAppointments.map((appointment) => (
                                <SelectItem key={appointment.id} value={appointment.id}>
                                  {format.dateTime(new Date(appointment.scheduledAt), { dateStyle: 'medium' })} —{' '}
                                  {appointment.reasonForVisit ?? t('reasonForVisitFallback')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {selectedPrescriptionAppointment && (
                        <PrescriptionPanel consultationSessionId={selectedPrescriptionAppointment.consultationSessionId} />
                      )}
                    </DialogContent>
                  </Dialog>
                </TabsContent>

                <TabsContent value="documents">
                  <Card className={CARD_CLASSNAME}>
                    <CardHeader className="flex flex-row items-center justify-between gap-3 px-7 py-6">
                      <CardTitle>{t('documents')}</CardTitle>
                      <UploadDocumentControl patientProfileId={patientProfileId} />
                    </CardHeader>
                    <CardContent className="px-7 pt-0 pb-7">
                      {documentsLoading && <Skeleton className="h-24 w-full" />}
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
            </div>
          </Page>
        );
      })()}
    </RequireRole>
  );
}

// Persistent allergy strip (Phase 4.3): three real states instead of two --
// has allergies (from `profile.allergies`), confirmed none (a doctor has
// explicitly set `allergiesConfirmedNoneAt`), or not yet asked (neither is
// set, the only state that shows the confirm action).
function AllergyTile({
  profile,
  patientProfileId,
}: {
  profile: DoctorPatientChartProfile;
  patientProfileId: string;
}) {
  const t = useTranslations('publicPatient');
  const confirmNoKnownAllergies = useConfirmNoKnownAllergies(patientProfileId);
  const hasAllergies = Boolean(profile.allergies);
  const confirmedNone = !hasAllergies && Boolean(profile.allergiesConfirmedNoneAt);
  const notYetAsked = !hasAllergies && !confirmedNone;

  const value = hasAllergies ? profile.allergies! : confirmedNone ? t('allergiesConfirmedNone') : t('noAllergiesOnRecord');

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-default/70 bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-2">
          <div
            className={cn(
              'flex size-8 items-center justify-center rounded-lg',
              confirmedNone ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis',
            )}
          >
            <Icon icon={confirmedNone ? CheckCircle2 : Flower2} size="sm" />
          </div>
          <div>
            <p className="text-xs text-text-tertiary">{t('allergies')}</p>
            <p className="text-sm font-medium text-text-primary">{value}</p>
          </div>
        </div>
        {notYetAsked && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={confirmNoKnownAllergies.isPending}
            onClick={() => confirmNoKnownAllergies.mutate()}
          >
            {t('confirmNoKnownAllergies')}
          </Button>
        )}
      </div>
      {confirmNoKnownAllergies.isError && <Alert variant="danger">{t('confirmNoKnownAllergiesError')}</Alert>}
    </div>
  );
}

// Add condition (Phase 4.1): a doctor-authored condition entry added
// directly from the chart, outside any consultation session.
function AddConditionButton({ patientProfileId }: { patientProfileId: string }) {
  const t = useTranslations('publicPatient');
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [certaintyLevel, setCertaintyLevel] = useState<CertaintyLevelValue>('suspected');
  const addCondition = useAddPatientCondition(patientProfileId);

  function handleOpenChange(next: boolean) {
    setOpen(next);
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
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <Icon icon={Plus} size="sm" />
          {t('addCondition')}
        </Button>
      </DialogTrigger>
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
function AppointmentRow({ appointment }: { appointment: DoctorPatientChartAppointment }) {
  const t = useTranslations('publicPatient');
  const format = useFormatter();
  const approveAppointment = useApproveAppointment();
  const declineAppointment = useDeclineAppointment();
  const [isDeclining, setIsDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const durationMinutes = appointment.endTime
    ? Math.round((new Date(appointment.endTime).getTime() - new Date(appointment.scheduledAt).getTime()) / 60_000)
    : undefined;
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
        <Badge variant={appointmentBadgeVariant[appointment.status]}>{t(`appointmentStatus.${appointment.status}`)}</Badge>
      </div>
      <p className="text-sm text-text-secondary">{appointment.reasonForVisit ?? t('reasonForVisitFallback')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral">{t(`consultationType.${appointment.consultationType}`)}</Badge>
        {durationMinutes !== undefined && (
          <span className="text-xs text-text-tertiary">{t('durationMinutes', { minutes: durationMinutes })}</span>
        )}
      </div>

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
