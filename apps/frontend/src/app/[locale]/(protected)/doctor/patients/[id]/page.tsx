'use client';

import {
  Activity,
  CalendarDays,
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
  Scale,
  Shield,
  Star,
  Stethoscope,
  UserRoundPlus,
  type LucideIcon,
} from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useDoctorReviews } from '@/features/consultation/hooks/use-doctor-reviews';
import {
  useDoctorPatientChartAppointments,
  useDoctorPatientChartDocuments,
  useDoctorPatientChartMedicalRecords,
  useDoctorPatientChartPrescriptions,
  useDoctorPatientChartProfile,
  useDoctorPatientChartVitals,
} from '@/features/doctor/hooks/use-doctor-patient-chart';
import { useDoctorProfile } from '@/features/doctor/hooks/use-doctor-profile';
import { RequireRole } from '@/shared/auth/require-role';
import { Alert } from '@/shared/ui/alert';
import { ApiError } from '@/shared/lib/api/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Badge, type BadgeProps } from '@/shared/ui/badge';
import { Icon } from '@/shared/icons/icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Page } from '@/shared/ui/layout/page';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';
import { cn } from '@/shared/lib/cn';
import type {
  DoctorPatientChartAppointment,
  DoctorPatientChartMedicalRecordEntry,
  DoctorPatientChartPrescription,
} from '@/features/doctor/api/types';

const CARD_CLASSNAME = 'rounded-2xl border-border-default/60 shadow-[0_10px_30px_rgba(15,23,42,0.05)]';

const NON_TERMINAL_STATUSES = new Set(['requested', 'confirmed', 'rescheduled']);

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
          <WorkspaceHeader title={t('title')} />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </Page>
      )}

      {!profileLoading && notFound && (
        <Page>
          <WorkspaceHeader title={t('title')} />
          <EmptyState title={t('notFoundTitle')} description={t('notFoundDescription')} />
        </Page>
      )}

      {!profileLoading && !notFound && (!profile || profileError) && (
        <Page>
          <WorkspaceHeader title={t('title')} />
          <Alert variant="danger">{t('loadError')}</Alert>
        </Page>
      )}

      {!profileLoading && profile && (() => {
        const age = profile.dateOfBirth ? ageFrom(profile.dateOfBirth) : undefined;
        const upcomingAppointments = (appointments ?? [])
          .filter((appointment) => NON_TERMINAL_STATUSES.has(appointment.status))
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        const pastAppointments = (appointments ?? [])
          .filter((appointment) => !NON_TERMINAL_STATUSES.has(appointment.status))
          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
        const completedCount = pastAppointments.filter((appointment) => appointment.status === 'completed').length;
        const activePrescriptionsCount = (prescriptions ?? []).filter((prescription) => prescription.status === 'active').length;
        const lastVisit = pastAppointments.find((appointment) => appointment.status === 'completed');

        return (
          <Page>
            <WorkspaceHeader title={t('title')} />

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
                      <p className="text-xl font-semibold text-text-primary">{profile.fullName}</p>
                      <p className="text-sm text-text-secondary">
                        {profile.gender ? t(`genderOptions.${profile.gender}`) : t('notOnRecord')}
                        {age !== undefined && ` · ${t('ageYearsOld', { age })}`}
                      </p>
                      <p className="text-xs text-text-tertiary">{t('patientId', { id: profile.id })}</p>
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

              <Tabs defaultValue="overview">
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
                            icon={Flower2}
                            iconClassName="bg-warning-subtle text-warning-emphasis"
                            label={t('allergies')}
                            value={profile.allergies || t('noAllergiesOnRecord')}
                          />
                          <InfoTile
                            icon={HeartPulse}
                            iconClassName="bg-neutral-subtle text-neutral"
                            label={t('chronicConditions')}
                            value={profile.chronicDiseases || t('noConditionsOnRecord')}
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
                    <CardHeader className="px-7 py-6">
                      <CardTitle>{t('medicalHistory')}</CardTitle>
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
                    <CardHeader className="px-7 py-6">
                      <CardTitle>{t('prescriptions')}</CardTitle>
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
                </TabsContent>

                <TabsContent value="documents">
                  <Card className={CARD_CLASSNAME}>
                    <CardHeader className="px-7 py-6">
                      <CardTitle>{t('documents')}</CardTitle>
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

function AppointmentRow({ appointment }: { appointment: DoctorPatientChartAppointment }) {
  const t = useTranslations('publicPatient');
  const format = useFormatter();
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border-default/70 p-4">
      <Avatar size="sm" className="shrink-0">
        {appointment.doctorAvatarUrl && <AvatarImage src={appointment.doctorAvatarUrl} alt={appointment.doctorName} />}
        <AvatarFallback>{initialsFor(appointment.doctorName)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-text-primary">{appointment.doctorName}</p>
          <Badge variant={appointmentBadgeVariant[appointment.status]}>{t(`appointmentStatus.${appointment.status}`)}</Badge>
        </div>
        <p className="text-sm text-text-secondary">{appointment.specialization}</p>
        <p className="text-xs text-text-tertiary">
          {format.dateTime(new Date(appointment.scheduledAt), { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>
    </li>
  );
}
