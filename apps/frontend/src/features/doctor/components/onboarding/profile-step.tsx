'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import type { DoctorProfile } from '@/features/doctor/api/types';
import { useDepartmentsList } from '@/features/doctor/hooks/use-departments-list';
import { useHospitalsList } from '@/features/doctor/hooks/use-hospitals-list';
import { useRegisterDoctorProfile } from '@/features/doctor/hooks/use-register-doctor-profile';
import { useUpdateDoctorProfile } from '@/features/doctor/hooks/use-update-doctor-profile';
import {
  createOnboardingProfileSchema,
  type OnboardingProfileFormValues,
} from '@/features/doctor/schemas/onboarding.schema';
import { useSpecialtiesList } from '@/features/reference/hooks/use-specialties-list';
import { ApiError } from '@/shared/lib/api/client';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Section } from '@/shared/ui/layout/section';
import { Textarea } from '@/shared/ui/textarea';

const MAX_WORK_EXPERIENCE_ENTRIES = 10;

const SUPPORTED_LANGUAGES = ['en', 'ar'] as const;
const PROFESSIONAL_RANKS = ['resident', 'registrar', 'specialist', 'consultant', 'professor'] as const;
// Doctor Onboarding hospital dropdown needs an explicit "Independent
// Practice" option (§2's UX table) alongside real hospitals -- a Select
// item can't carry an empty-string value, so this sentinel maps to
// `hospitalId: undefined` at the form-state level (see onValueChange below).
const INDEPENDENT_PRACTICE_VALUE = '__independent_practice__';

export interface ProfileStepProps {
  /** Undefined the first time through (no DoctorProfile exists yet) -- the step registers instead of updates. */
  profile: DoctorProfile | undefined;
  onSaved: (profile: DoctorProfile) => void;
}

/**
 * Doctor Onboarding (Phase 4 continuation; redesigned Onboarding Redesign
 * 2026-07-21 proposal, Stage O.6): the wizard's Professional Info step --
 * creates the profile via the real `POST /doctors` the first time through
 * (a still-Patient applicant), or updates it via the existing
 * `PATCH /doctors/me` on every later pass (editing before submission, or
 * after a rejection). Onboarding Redesign Stage O.9: `specialtyId` is the
 * sole source of a doctor's specialty now -- the transitional free-text
 * `specialty` field this step used to also derive and send is gone.
 */
export function ProfileStep({ profile, onSaved }: ProfileStepProps) {
  const t = useTranslations('doctor.onboarding.profileStep');
  const tValidation = useTranslations('doctor.onboarding.profileStep.validation');
  const tLanguages = useTranslations('doctor.profile.languageNames');
  const tRanks = useTranslations('doctor.onboarding.profileStep.professionalRanks');
  const { data: hospitals, isLoading: hospitalsLoading } = useHospitalsList();
  const { data: specialties, isLoading: specialtiesLoading } = useSpecialtiesList();
  const registerProfile = useRegisterDoctorProfile();
  const updateProfile = useUpdateDoctorProfile();
  const isEditing = Boolean(profile);
  const mutation = isEditing ? updateProfile : registerProfile;
  const [insuranceDraft, setInsuranceDraft] = useState('');

  const form = useForm<OnboardingProfileFormValues>({
    resolver: zodResolver(createOnboardingProfileSchema(tValidation)),
    defaultValues: {
      licenseNumber: profile?.licenseNumber ?? '',
      specialtyId: profile?.specialtyId ?? '',
      biography: profile?.biography,
      yearsOfExperience: profile?.yearsOfExperience,
      languages: profile?.languages ?? [],
      insuranceProviders: profile?.insuranceProviders ?? [],
      consultationFeeAmount: profile?.consultationFeeAmount,
      hospitalId: profile?.hospitalId,
      professionalRank: profile?.professionalRank,
      licenseExpiryDate: profile?.licenseExpiryDate?.slice(0, 10) ?? '',
      departmentId: profile?.departmentId,
      workExperience:
        profile?.workExperience.map((entry) => ({
          organizationName: entry.organizationName,
          position: entry.position,
          professionalRank: entry.professionalRank,
          startDate: entry.startDate.slice(0, 10),
          endDate: entry.endDate?.slice(0, 10),
          description: entry.description,
        })) ?? [],
    },
  });

  const selectedHospitalId = form.watch('hospitalId');
  const { data: departments, isLoading: departmentsLoading } = useDepartmentsList(selectedHospitalId);
  const workExperience = useFieldArray({ control: form.control, name: 'workExperience' });

  async function onSubmit(values: OnboardingProfileFormValues) {
    try {
      // licenseNumber is disabled (not removed) on the edit pass -- it's
      // still present in react-hook-form's values, but PATCH /doctors/me's
      // real DTO never accepts it (only registration sets it, once), and
      // the global ValidationPipe's forbidNonWhitelisted rejects any extra
      // field outright. Strip it here rather than loosening the backend
      // contract for a field that's genuinely immutable after registration.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude it from updateValues
      const { licenseNumber: _licenseNumber, ...updateValues } = values;
      const saved = isEditing ? await updateProfile.mutateAsync(updateValues) : await registerProfile.mutateAsync(values);
      onSaved(saved);
    } catch {
      // Inline error rendered below from mutation.error.
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {mutation.error instanceof ApiError && (
          <Alert variant="danger" role="alert">
            {mutation.error.message}
          </Alert>
        )}

        <FormField
          control={form.control}
          name="licenseNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('licenseNumber')}</FormLabel>
              <FormControl>
                <Input {...field} disabled={isEditing} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="specialtyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('specialty')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={specialtiesLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('specialtyPlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(specialties ?? []).map((specialty) => (
                    <SelectItem key={specialty.id} value={specialty.id}>
                      {specialty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="professionalRank"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('professionalRank')}</FormLabel>
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('professionalRankPlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PROFESSIONAL_RANKS.map((rank) => (
                    <SelectItem key={rank} value={rank}>
                      {tRanks(rank)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="licenseExpiryDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('licenseExpiryDate')}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="biography"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('biography')}</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="yearsOfExperience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('experience')}</FormLabel>
              <FormControl>
                <Input type="number" min={0} max={80} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="consultationFeeAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('consultationFee')}</FormLabel>
              <FormControl>
                <Input type="number" min={0} step="0.01" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hospitalId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('hospital')}</FormLabel>
              <Select
                value={field.value ?? INDEPENDENT_PRACTICE_VALUE}
                onValueChange={(value) => {
                  const nextHospitalId = value === INDEPENDENT_PRACTICE_VALUE ? undefined : value;
                  field.onChange(nextHospitalId);
                  if (!nextHospitalId) {
                    form.setValue('departmentId', undefined);
                  }
                }}
                disabled={hospitalsLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('hospitalPlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={INDEPENDENT_PRACTICE_VALUE}>{t('independentPractice')}</SelectItem>
                  {(hospitals ?? []).map((hospital) => (
                    <SelectItem key={hospital.id} value={hospital.id}>
                      {hospital.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedHospitalId && (
          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('department')}</FormLabel>
                <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={departmentsLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('departmentPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(departments ?? []).map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="languages"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('languages')}</FormLabel>
              <FormControl>
                <div className="flex flex-col gap-2">
                  {SUPPORTED_LANGUAGES.map((language) => (
                    <label key={language} className="flex items-center gap-2 text-sm text-text-secondary">
                      <Checkbox
                        checked={field.value?.includes(language)}
                        onCheckedChange={(checked) => {
                          const next = checked
                            ? [...(field.value ?? []), language]
                            : (field.value ?? []).filter((value) => value !== language);
                          field.onChange(next);
                        }}
                      />
                      {tLanguages(language)}
                    </label>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="insuranceProviders"
          render={({ field }) => {
            const providers = field.value ?? [];
            function addProvider() {
              const trimmed = insuranceDraft.trim();
              if (!trimmed || providers.includes(trimmed)) return;
              field.onChange([...providers, trimmed]);
              setInsuranceDraft('');
            }
            return (
              <FormItem>
                <FormLabel>{t('insuranceProviders')}</FormLabel>
                <FormControl>
                  <div className="flex flex-col gap-2">
                    {providers.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {providers.map((provider) => (
                          <Badge key={provider} variant="neutral" className="gap-1.5">
                            {provider}
                            <button
                              type="button"
                              aria-label={t('removeInsuranceProvider', { provider })}
                              onClick={() => field.onChange(providers.filter((value) => value !== provider))}
                            >
                              <Icon icon={X} size="xs" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={insuranceDraft}
                        onChange={(event) => setInsuranceDraft(event.target.value)}
                        placeholder={t('insuranceProvidersPlaceholder')}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addProvider();
                          }
                        }}
                      />
                      <Button type="button" variant="outline" onClick={addProvider}>
                        {t('addInsuranceProvider')}
                      </Button>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <Section
          title={t('workExperience')}
          actions={
            workExperience.fields.length < MAX_WORK_EXPERIENCE_ENTRIES ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  workExperience.append({
                    organizationName: '',
                    position: '',
                    professionalRank: undefined,
                    startDate: '',
                    endDate: undefined,
                    description: '',
                  })
                }
              >
                <Icon icon={Plus} size="sm" className="me-2" />
                {t('addWorkExperience')}
              </Button>
            ) : undefined
          }
        >
          {workExperience.fields.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('workExperienceEmpty')}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {workExperience.fields.map((entryField, index) => {
                const isCurrent = !form.watch(`workExperience.${index}.endDate`);
                return (
                  <div key={entryField.id} className="flex flex-col gap-3 rounded-lg border border-border-default p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-1 flex-col gap-3">
                        <FormField
                          control={form.control}
                          name={`workExperience.${index}.organizationName`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('workExperienceOrganization')}</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`workExperience.${index}.position`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('workExperiencePosition')}</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`workExperience.${index}.professionalRank`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('workExperienceRank')}</FormLabel>
                              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('workExperienceRankPlaceholder')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {PROFESSIONAL_RANKS.map((rank) => (
                                    <SelectItem key={rank} value={rank}>
                                      {tRanks(rank)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`workExperience.${index}.startDate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('workExperienceStartDate')}</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <label className="flex items-center gap-2 text-sm text-text-secondary">
                          <Checkbox
                            checked={isCurrent}
                            onCheckedChange={(checked) => {
                              form.setValue(`workExperience.${index}.endDate`, checked ? undefined : '');
                            }}
                          />
                          {t('workExperienceCurrentlyWorkHere')}
                        </label>
                        {!isCurrent && (
                          <FormField
                            control={form.control}
                            name={`workExperience.${index}.endDate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('workExperienceEndDate')}</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <FormField
                          control={form.control}
                          name={`workExperience.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('workExperienceDescription')}</FormLabel>
                              <FormControl>
                                <Textarea {...field} value={field.value ?? ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t('removeWorkExperience')}
                        onClick={() => workExperience.remove(index)}
                      >
                        <Icon icon={Trash2} size="sm" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Button type="submit" loading={mutation.isPending}>
          {isEditing ? t('saveAndContinue') : t('createAndContinue')}
        </Button>
      </form>
    </Form>
  );
}
