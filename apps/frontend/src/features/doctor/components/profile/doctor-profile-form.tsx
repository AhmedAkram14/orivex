'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState, type ReactNode } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import type { DoctorProfile } from '@/features/doctor/api/types';
import {
  DepartmentCombobox,
  FeeInput,
  HospitalCombobox,
  InsuranceTokens,
  LanguageChips,
  SpecialtyCombobox,
  WorkExperienceEditor,
  YearsStepper,
} from '@/features/doctor/components/profile-fields';
import { useUpdateDoctorProfile } from '@/features/doctor/hooks/use-update-doctor-profile';
import { createDoctorProfileSchema, type DoctorProfileFormValues } from '@/features/doctor/schemas/profile.schema';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { ApiError } from '@/shared/lib/api/client';
import { Icon } from '@/shared/icons/icon';
import { ActionBar } from '@/shared/ui/action-bar';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

const MAX_WORK_EXPERIENCE_ENTRIES = 10;
const MAX_PUBLICATION_ENTRIES = 20;
const MAX_AWARD_ENTRIES = 20;

export interface DoctorProfileFormProps {
  profile: DoctorProfile;
  onSaved: () => void;
  onCancel: () => void;
}

const errorIcon = <Icon icon={CircleAlert} size="xs" className="mt-px shrink-0" />;

function Group({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5 rounded-(--r-card) border border-border-default bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 id={id} className="text-small font-semibold text-text-secondary">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * The Doctor Profile's edit architecture — every field
 * `DoctorProfileUpdateRequest` actually allows: specialtyId, biography,
 * years of experience, languages, consultation fee, hospital/department
 * affiliation, insurance providers, and the work-experience/publications/
 * awards lists. Identity fields (`fullName`, `email`, `phoneNumber`) are
 * Account-owned and `licenseNumber` is excluded on purpose (the backend's update DTO never accepts it -- only set
 * once at registration).
 *
 * The same controls as the doctor application's Professional Info step (`profile-fields`): a searchable specialty
 * with its glyph, the years stepper, the EGP fee, a deduplicated hospital list, language chips, insurance tokens and
 * work experience edited in a dialog. Same body as before.
 */
export function DoctorProfileForm({ profile, onSaved, onCancel }: DoctorProfileFormProps) {
  const t = useTranslations('doctor.profile');
  const tValidation = useTranslations('doctor.profile.validation');
  const tShared = useTranslations('doctor.onboarding.profileStep');
  const updateProfile = useUpdateDoctorProfile();
  const languagesLabelId = useId();
  // Removing a publication or award is destructive: it goes through ConfirmDialog, never window.confirm.
  const [pendingRemove, setPendingRemove] = useState<{ kind: 'publication' | 'award'; index: number } | null>(null);

  const form = useForm<DoctorProfileFormValues>({
    mode: 'onTouched',
    resolver: zodResolver(createDoctorProfileSchema(tValidation)),
    defaultValues: {
      specialtyId: profile.specialtyId,
      biography: profile.biography,
      yearsOfExperience: profile.yearsOfExperience,
      languages: profile.languages,
      insuranceProviders: profile.insuranceProviders,
      consultationFeeAmount: profile.consultationFeeAmount,
      hospitalId: profile.hospitalId,
      departmentId: profile.departmentId,
      workExperience: profile.workExperience.map((entry) => ({
        organizationName: entry.organizationName,
        position: entry.position,
        professionalRank: entry.professionalRank,
        startDate: entry.startDate.slice(0, 10),
        endDate: entry.endDate?.slice(0, 10),
        description: entry.description,
      })),
      publications: profile.publications.map((entry) => ({ title: entry.title, reference: entry.reference })),
      awards: profile.awards.map((entry) => ({ title: entry.title, issuingBody: entry.issuingBody })),
    },
  });

  useUnsavedChangesGuard(form.formState.isDirty, t('unsavedChangesWarning'));

  const selectedHospitalId = useWatch({ control: form.control, name: 'hospitalId' });
  const workExperience = useFieldArray({ control: form.control, name: 'workExperience' });
  const publications = useFieldArray({ control: form.control, name: 'publications' });
  const awards = useFieldArray({ control: form.control, name: 'awards' });

  async function onSubmit(values: DoctorProfileFormValues) {
    try {
      await updateProfile.mutateAsync(values);
      onSaved();
    } catch {
      // Inline error rendered below from `updateProfile.error`.
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {updateProfile.error instanceof ApiError && (
          <Alert variant="danger" role="alert">
            {updateProfile.error.message}
          </Alert>
        )}

        <Group title={tShared('groups.practice')}>
          <FormField
            control={form.control}
            name="specialtyId"
            render={({ field }) => (
              <FormItem className="gap-2">
                <FormLabel className="font-semibold">{t('specialty')}</FormLabel>
                <SpecialtyCombobox field={field} />
                <FormMessage icon={errorIcon} />
              </FormItem>
            )}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="yearsOfExperience"
              render={({ field }) => (
                <FormItem className="gap-2">
                  <FormLabel className="font-semibold">{t('yearsOfExperienceLabel')}</FormLabel>
                  <YearsStepper field={field} />
                  <FormMessage icon={errorIcon} />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="consultationFeeAmount"
              render={({ field }) => (
                <FormItem className="gap-2">
                  <FormLabel className="font-semibold">{t('consultationFee')}</FormLabel>
                  <FeeInput field={field} />
                  <FormMessage icon={errorIcon} />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="hospitalId"
              render={({ field }) => (
                <FormItem className="gap-2">
                  <FormLabel className="font-semibold">{tShared('hospital')}</FormLabel>
                  <HospitalCombobox field={field} onIndependent={() => form.setValue('departmentId', undefined, { shouldDirty: true })} />
                  <FormMessage icon={errorIcon} />
                </FormItem>
              )}
            />
            {selectedHospitalId && (
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem className="gap-2">
                    <FormLabel className="font-semibold">{tShared('department')}</FormLabel>
                    <DepartmentCombobox field={field} hospitalId={selectedHospitalId} />
                    <FormMessage icon={errorIcon} />
                  </FormItem>
                )}
              />
            )}
          </div>
        </Group>

        <Group title={tShared('groups.aboutYou')}>
          <FormField
            control={form.control}
            name="biography"
            render={({ field }) => (
              <FormItem className="gap-2">
                <FormLabel className="font-semibold">{t('about')}</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ''} rows={4} dir="auto" />
                </FormControl>
                <FormMessage icon={errorIcon} />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="languages"
            render={({ field }) => (
              <FormItem className="gap-2">
                <FormLabel id={languagesLabelId} className="font-semibold">
                  {t('languages')}
                </FormLabel>
                <LanguageChips field={field} labelId={languagesLabelId} />
                <FormMessage icon={errorIcon} />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="insuranceProviders"
            render={({ field }) => (
              <FormItem className="gap-2">
                <FormLabel className="font-semibold">{tShared('insuranceProviders')}</FormLabel>
                <InsuranceTokens field={field} placeholder={tShared('insuranceProvidersPlaceholder')} />
                <FormDescription className="text-small text-text-tertiary">{tShared('insuranceProvidersHelp')}</FormDescription>
                <FormMessage icon={errorIcon} />
              </FormItem>
            )}
          />
        </Group>

        <Group title={tShared('workExperience')}>
          <WorkExperienceEditor
            entries={workExperience.fields}
            max={MAX_WORK_EXPERIENCE_ENTRIES}
            onAdd={workExperience.append}
            onUpdate={workExperience.update}
            onRemove={workExperience.remove}
          />
        </Group>

        <Group
          title={t('publications')}
          action={
            publications.fields.length < MAX_PUBLICATION_ENTRIES ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => publications.append({ title: '', reference: '' })}>
                <Icon icon={Plus} size="sm" />
                {t('addPublication')}
              </Button>
            ) : undefined
          }
        >
          {publications.fields.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('publicationsFormEmpty')}</p>
          ) : (
            <div className="flex flex-col divide-y divide-border-default">
              {publications.fields.map((entryField, index) => (
                <div key={entryField.id} className="flex items-start gap-2 py-3 first:pt-0 last:pb-0">
                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`publications.${index}.title`}
                      render={({ field }) => (
                        <FormItem className="gap-2">
                          <FormLabel className="font-semibold">{t('publicationTitle')}</FormLabel>
                          <FormControl>
                            <Input {...field} dir="auto" />
                          </FormControl>
                          <FormMessage icon={errorIcon} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`publications.${index}.reference`}
                      render={({ field }) => (
                        <FormItem className="gap-2">
                          <FormLabel className="font-semibold">{t('publicationReference')}</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} dir="auto" />
                          </FormControl>
                          <FormMessage icon={errorIcon} />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="mt-7" aria-label={t('removePublication')} onClick={() => setPendingRemove({ kind: 'publication', index })}>
                    <Icon icon={Trash2} size="sm" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Group>

        <Group
          title={t('awards')}
          action={
            awards.fields.length < MAX_AWARD_ENTRIES ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => awards.append({ title: '', issuingBody: '' })}>
                <Icon icon={Plus} size="sm" />
                {t('addAward')}
              </Button>
            ) : undefined
          }
        >
          {awards.fields.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('awardsFormEmpty')}</p>
          ) : (
            <div className="flex flex-col divide-y divide-border-default">
              {awards.fields.map((entryField, index) => (
                <div key={entryField.id} className="flex items-start gap-2 py-3 first:pt-0 last:pb-0">
                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`awards.${index}.title`}
                      render={({ field }) => (
                        <FormItem className="gap-2">
                          <FormLabel className="font-semibold">{t('awardTitle')}</FormLabel>
                          <FormControl>
                            <Input {...field} dir="auto" />
                          </FormControl>
                          <FormMessage icon={errorIcon} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`awards.${index}.issuingBody`}
                      render={({ field }) => (
                        <FormItem className="gap-2">
                          <FormLabel className="font-semibold">{t('awardIssuingBody')}</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} dir="auto" />
                          </FormControl>
                          <FormMessage icon={errorIcon} />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="mt-7" aria-label={t('removeAward')} onClick={() => setPendingRemove({ kind: 'award', index })}>
                    <Icon icon={Trash2} size="sm" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Group>

        {/* Save is disabled until something has actually changed (`isDirty`); an invalid-but-dirty submit still goes
            through so its real field errors surface. */}
        <ActionBar
          start={
            <Button type="button" variant="secondary" onClick={onCancel}>
              {t('cancel')}
            </Button>
          }
          end={
            <Button type="submit" loading={updateProfile.isPending} disabled={!form.formState.isDirty}>
              {t('save')}
            </Button>
          }
        />
      </form>
      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(next) => !next && setPendingRemove(null)}
        title={pendingRemove?.kind === 'publication' ? t('removePublication') : t('removeAward')}
        description={pendingRemove?.kind === 'publication' ? t('confirmRemovePublication') : t('confirmRemoveAward')}
        confirmLabel={pendingRemove?.kind === 'publication' ? t('removePublication') : t('removeAward')}
        onConfirm={() => {
          if (pendingRemove?.kind === 'publication') publications.remove(pendingRemove.index);
          if (pendingRemove?.kind === 'award') awards.remove(pendingRemove.index);
          setPendingRemove(null);
        }}
      />
    </Form>
  );
}
