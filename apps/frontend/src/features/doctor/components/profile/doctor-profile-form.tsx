'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import type { DoctorProfile } from '@/features/doctor/api/types';
import { useUpdateDoctorProfile } from '@/features/doctor/hooks/use-update-doctor-profile';
import {
  createDoctorProfileSchema,
  type DoctorProfileFormValues,
} from '@/features/doctor/schemas/profile.schema';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

const SUPPORTED_LANGUAGES = ['en', 'ar'] as const;

export interface DoctorProfileFormProps {
  profile: DoctorProfile;
  onSaved: () => void;
  onCancel: () => void;
}

/**
 * The Doctor Profile's edit architecture — only the fields
 * `DoctorProfileUpdateRequest` actually allows (specialty, biography, years
 * of experience, languages). Identity fields (`fullName`, `email`,
 * `phoneNumber`) are Account-owned (Identity has no update-profile endpoint
 * yet) and `licenseNumber`/`publications`/`awards` are excluded from this
 * phase's edit architecture — mirrors `PatientProfileForm`'s own identity-
 * field exclusion rationale exactly.
 */
export function DoctorProfileForm({ profile, onSaved, onCancel }: DoctorProfileFormProps) {
  const t = useTranslations('doctor.profile');
  const tValidation = useTranslations('doctor.profile.validation');
  const tLanguages = useTranslations('doctor.profile.languageNames');
  const updateProfile = useUpdateDoctorProfile();

  const form = useForm<DoctorProfileFormValues>({
    resolver: zodResolver(createDoctorProfileSchema(tValidation)),
    defaultValues: {
      specialty: profile.specialty,
      biography: profile.biography,
      yearsOfExperience: profile.yearsOfExperience,
      languages: profile.languages,
    },
  });

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
