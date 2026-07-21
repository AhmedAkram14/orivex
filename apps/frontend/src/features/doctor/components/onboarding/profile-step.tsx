'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import type { DoctorProfile } from '@/features/doctor/api/types';
import { useHospitalsList } from '@/features/doctor/hooks/use-hospitals-list';
import { useRegisterDoctorProfile } from '@/features/doctor/hooks/use-register-doctor-profile';
import { useUpdateDoctorProfile } from '@/features/doctor/hooks/use-update-doctor-profile';
import {
  createOnboardingProfileSchema,
  type OnboardingProfileFormValues,
} from '@/features/doctor/schemas/onboarding.schema';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';

const SUPPORTED_LANGUAGES = ['en', 'ar'] as const;

export interface ProfileStepProps {
  /** Undefined the first time through (no DoctorProfile exists yet) -- the step registers instead of updates. */
  profile: DoctorProfile | undefined;
  onSaved: (profile: DoctorProfile) => void;
}

/**
 * Doctor Onboarding (Phase 4 continuation): the wizard's first step --
 * creates the profile via the real `POST /doctors` the first time through
 * (a still-Patient applicant), or updates it via the existing
 * `PATCH /doctors/me` on every later pass (editing before submission, or
 * after a rejection). Reuses `DoctorProfileForm`'s exact field set plus
 * `licenseNumber` (set once, at creation, per `RegisterDoctorProfileRequestDto`)
 * and an optional hospital affiliation (`GET /hospitals`, the public
 * directory -- Stage 4's `hospitalId` column, now genuinely wired).
 */
export function ProfileStep({ profile, onSaved }: ProfileStepProps) {
  const t = useTranslations('doctor.onboarding.profileStep');
  const tValidation = useTranslations('doctor.onboarding.profileStep.validation');
  const tLanguages = useTranslations('doctor.profile.languageNames');
  const { data: hospitals, isLoading: hospitalsLoading } = useHospitalsList();
  const registerProfile = useRegisterDoctorProfile();
  const updateProfile = useUpdateDoctorProfile();
  const isEditing = Boolean(profile);
  const mutation = isEditing ? updateProfile : registerProfile;

  const form = useForm<OnboardingProfileFormValues>({
    resolver: zodResolver(createOnboardingProfileSchema(tValidation)),
    defaultValues: {
      licenseNumber: profile?.licenseNumber ?? '',
      specialty: profile?.specialty ?? '',
      biography: profile?.biography,
      yearsOfExperience: profile?.yearsOfExperience,
      languages: profile?.languages ?? [],
      consultationFeeAmount: profile?.consultationFeeAmount,
      hospitalId: profile?.hospitalId,
    },
  });

  async function onSubmit(values: OnboardingProfileFormValues) {
    try {
      const saved = isEditing
        ? await updateProfile.mutateAsync(values)
        : await registerProfile.mutateAsync({ ...values, licenseNumber: values.licenseNumber });
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
          name="specialty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('specialty')}</FormLabel>
              <FormControl>
                <Input {...field} />
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
              <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={hospitalsLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('hospitalPlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
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

        <Button type="submit" loading={mutation.isPending}>
          {isEditing ? t('saveAndContinue') : t('createAndContinue')}
        </Button>
      </form>
    </Form>
  );
}
