'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import type { Account } from '@/features/identity/api/types';
import { useUpdatePersonalProfile } from '@/features/identity/hooks/use-update-personal-profile';
import { createPersonalInfoSchema, type PersonalInfoFormValues } from '@/features/identity/schemas/personal-info.schema';
import { useCountriesList } from '@/features/reference/hooks/use-countries-list';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';

export interface PersonalInfoStepProps {
  account: Account | undefined;
  onSaved: (account: Account) => void;
}

/**
 * Onboarding Redesign (2026-07-21 proposal, §0a/§2/Stage O.6): the shared
 * Personal Info step -- ONE component and ONE endpoint (PATCH /accounts/me)
 * reused verbatim by the Doctor Onboarding wizard's new leading step here,
 * and by the future Patient Profile Editor (Stage O.7), never two separate
 * implementations. Full name is Account-owned and set once at registration
 * (`DisplayName`, no update endpoint exists) -- shown read-only, never a
 * fabricated editable field the backend can't actually save.
 */
export function PersonalInfoStep({ account, onSaved }: PersonalInfoStepProps) {
  const t = useTranslations('identity.personalInfoStep');
  const tValidation = useTranslations('identity.personalInfoStep.validation');
  const { data: countries, isLoading: countriesLoading } = useCountriesList();
  const updatePersonalProfile = useUpdatePersonalProfile();

  const form = useForm<PersonalInfoFormValues>({
    resolver: zodResolver(createPersonalInfoSchema(tValidation)),
    defaultValues: {
      dateOfBirth: account?.dateOfBirth?.slice(0, 10) ?? '',
      gender: account?.gender,
      nationalityId: account?.nationalityId ?? '',
      address: account?.address ?? '',
    },
  });

  async function onSubmit(values: PersonalInfoFormValues) {
    try {
      const saved = await updatePersonalProfile.mutateAsync(values);
      onSaved(saved);
    } catch {
      // Inline error rendered below from mutation.error.
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {updatePersonalProfile.error instanceof ApiError && (
          <Alert variant="danger" role="alert">
            {updatePersonalProfile.error.message}
          </Alert>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-primary">{t('fullName')}</span>
          <p className="text-sm text-text-secondary">{account?.displayName}</p>
        </div>

        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('dateOfBirth')}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('gender')}</FormLabel>
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('genderPlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male">{t('genderOptions.male')}</SelectItem>
                  <SelectItem value="female">{t('genderOptions.female')}</SelectItem>
                  <SelectItem value="other">{t('genderOptions.other')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nationalityId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('nationality')}</FormLabel>
              <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={countriesLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('nationalityPlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(countries ?? []).map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name}
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
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('address')}</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" loading={updatePersonalProfile.isPending}>
          {t('saveAndContinue')}
        </Button>
      </form>
    </Form>
  );
}
