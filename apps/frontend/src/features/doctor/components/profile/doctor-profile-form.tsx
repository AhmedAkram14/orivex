'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFieldArray, useForm } from 'react-hook-form';
import type { DoctorProfile } from '@/features/doctor/api/types';
import { useUpdateDoctorProfile } from '@/features/doctor/hooks/use-update-doctor-profile';
import {
  createDoctorProfileSchema,
  type DoctorProfileFormValues,
} from '@/features/doctor/schemas/profile.schema';
import { useSpecialtiesList } from '@/features/reference/hooks/use-specialties-list';
import { ApiError } from '@/shared/lib/api/client';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';

const SUPPORTED_LANGUAGES = ['en', 'ar'] as const;
const PROFESSIONAL_RANKS = ['resident', 'registrar', 'specialist', 'consultant', 'professor'] as const;
const MAX_WORK_EXPERIENCE_ENTRIES = 10;
const MAX_PUBLICATION_ENTRIES = 20;
const MAX_AWARD_ENTRIES = 20;

export interface DoctorProfileFormProps {
  profile: DoctorProfile;
  onSaved: () => void;
  onCancel: () => void;
}

/**
 * The Doctor Profile's edit architecture — only the fields
 * `DoctorProfileUpdateRequest` actually allows (specialtyId, biography,
 * years of experience, languages). Identity fields (`fullName`, `email`,
 * `phoneNumber`) are Account-owned (Identity has no update-profile endpoint
 * yet) and `licenseNumber`/`publications`/`awards` are excluded from this
 * phase's edit architecture — mirrors `PatientProfileForm`'s own identity-
 * field exclusion rationale exactly. Onboarding Redesign Stage O.9: this is
 * now a reference-data dropdown (mirrors the Doctor Onboarding wizard's own
 * Professional Info step), not a free-text input -- DoctorProfile no longer
 * carries its own free-text specialty at all.
 */
export function DoctorProfileForm({ profile, onSaved, onCancel }: DoctorProfileFormProps) {
  const t = useTranslations('doctor.profile');
  const tValidation = useTranslations('doctor.profile.validation');
  const tLanguages = useTranslations('doctor.profile.languageNames');
  const tShared = useTranslations('doctor.onboarding.profileStep');
  const tRanks = useTranslations('doctor.onboarding.profileStep.professionalRanks');
  const updateProfile = useUpdateDoctorProfile();
  const { data: specialties, isLoading: specialtiesLoading } = useSpecialtiesList();

  const form = useForm<DoctorProfileFormValues>({
    resolver: zodResolver(createDoctorProfileSchema(tValidation)),
    defaultValues: {
      specialtyId: profile.specialtyId,
      biography: profile.biography,
      yearsOfExperience: profile.yearsOfExperience,
      languages: profile.languages,
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
          name="biography"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('professionalInformation')}</FormLabel>
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
              <FormLabel>{t('yearsOfExperienceLabel')}</FormLabel>
              <FormControl>
                <Input type="number" min={0} max={80} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-text-primary">{tShared('workExperience')}</p>
            {workExperience.fields.length < MAX_WORK_EXPERIENCE_ENTRIES && (
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
                {tShared('addWorkExperience')}
              </Button>
            )}
          </div>

          {workExperience.fields.length === 0 ? (
            <p className="text-sm text-text-secondary">{tShared('workExperienceEmpty')}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {workExperience.fields.map((entryField, index) => {
                // Deliberately `=== undefined`, not a truthiness check --
                // unchecking sets endDate to '' (a placeholder so the date
                // input has a defined, editable value), and '' is falsy in
                // JS, so `!watchedValue` would immediately flip back to
                // "currently work here" the instant the box was unchecked.
                const isCurrent = form.watch(`workExperience.${index}.endDate`) === undefined;
                return (
                  <div key={entryField.id} className="flex flex-col gap-3 rounded-lg border border-border-default p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-1 flex-col gap-3">
                        <FormField
                          control={form.control}
                          name={`workExperience.${index}.organizationName`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{tShared('workExperienceOrganization')}</FormLabel>
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
                              <FormLabel>{tShared('workExperiencePosition')}</FormLabel>
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
                              <FormLabel>{tShared('workExperienceRank')}</FormLabel>
                              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={tShared('workExperienceRankPlaceholder')} />
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
                              <FormLabel>{tShared('workExperienceStartDate')}</FormLabel>
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
                          {tShared('workExperienceCurrentlyWorkHere')}
                        </label>
                        {!isCurrent && (
                          <FormField
                            control={form.control}
                            name={`workExperience.${index}.endDate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{tShared('workExperienceEndDate')}</FormLabel>
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
                              <FormLabel>{tShared('workExperienceDescription')}</FormLabel>
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
                        aria-label={tShared('removeWorkExperience')}
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
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-text-primary">{t('publications')}</p>
            {publications.fields.length < MAX_PUBLICATION_ENTRIES && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => publications.append({ title: '', reference: '' })}
              >
                <Icon icon={Plus} size="sm" className="me-2" />
                {t('addPublication')}
              </Button>
            )}
          </div>

          {publications.fields.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('publicationsFormEmpty')}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {publications.fields.map((entryField, index) => (
                <div key={entryField.id} className="flex flex-col gap-3 rounded-lg border border-border-default p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-1 flex-col gap-3">
                      <FormField
                        control={form.control}
                        name={`publications.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('publicationTitle')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`publications.${index}.reference`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('publicationReference')}</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ''} />
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
                      aria-label={t('removePublication')}
                      onClick={() => publications.remove(index)}
                    >
                      <Icon icon={Trash2} size="sm" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-text-primary">{t('awards')}</p>
            {awards.fields.length < MAX_AWARD_ENTRIES && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => awards.append({ title: '', issuingBody: '' })}
              >
                <Icon icon={Plus} size="sm" className="me-2" />
                {t('addAward')}
              </Button>
            )}
          </div>

          {awards.fields.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('awardsFormEmpty')}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {awards.fields.map((entryField, index) => (
                <div key={entryField.id} className="flex flex-col gap-3 rounded-lg border border-border-default p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-1 flex-col gap-3">
                      <FormField
                        control={form.control}
                        name={`awards.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('awardTitle')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`awards.${index}.issuingBody`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('awardIssuingBody')}</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ''} />
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
                      aria-label={t('removeAward')}
                      onClick={() => awards.remove(index)}
                    >
                      <Icon icon={Trash2} size="sm" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" loading={updateProfile.isPending}>
            {t('save')}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('cancel')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
