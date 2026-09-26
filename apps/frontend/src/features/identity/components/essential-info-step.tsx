'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import type { Account } from '@/features/identity/api/types';
import { useUpdatePersonalProfile } from '@/features/identity/hooks/use-update-personal-profile';
import { createEssentialInfoSchema, type EssentialInfoFormValues } from '@/features/identity/schemas/personal-info.schema';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

export interface EssentialInfoStepProps {
  account: Account | undefined;
  onSaved: (account: Account) => void;
}

/**
 * The patient intake's single step: only what booking truly needs (date of
 * birth, gender, phone -- the name is set at registration). Same endpoint and
 * hook as the full `PersonalInfoStep` (PATCH /accounts/me, partial body);
 * nationality and address are optional and live on the profile page.
 */
export function EssentialInfoStep({ account, onSaved }: EssentialInfoStepProps) {
  const t = useTranslations('identity.personalInfoStep');
  const tValidation = useTranslations('identity.personalInfoStep.validation');
  const updatePersonalProfile = useUpdatePersonalProfile();

  const form = useForm<EssentialInfoFormValues>({
    mode: 'onTouched',
    resolver: zodResolver(createEssentialInfoSchema(tValidation)),
    defaultValues: {
      dateOfBirth: account?.dateOfBirth?.slice(0, 10) ?? '',
      gender: account?.gender,
      phoneNumber: account?.phoneNumber ?? '',
    },
  });

  async function onSubmit(values: EssentialInfoFormValues) {
    try {
      onSaved(await updatePersonalProfile.mutateAsync(values));
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
          <span className="text-small font-medium text-text-primary">{t('fullName')}</span>
          <p className="text-small text-text-secondary">
            <bdi>{account?.displayName}</bdi>
          </p>
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
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('phone')}</FormLabel>
              <FormControl>
                <Input type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder={t('phonePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" loading={updatePersonalProfile.isPending}>
          {t('saveAndContinue')}
        </Button>
      </form>
    </Form>
  );
}
