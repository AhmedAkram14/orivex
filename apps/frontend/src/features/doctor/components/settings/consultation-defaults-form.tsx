'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm, type Resolver } from 'react-hook-form';
import type { DoctorProfile } from '@/features/doctor/api/types';
import { useDoctorProfile } from '@/features/doctor/hooks/use-doctor-profile';
import { useUpdateDoctorProfile } from '@/features/doctor/hooks/use-update-doctor-profile';
import {
  createConsultationDefaultsSchema,
  type ConsultationDefaultsFormValues,
} from '@/features/doctor/schemas/consultation-defaults.schema';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import { toast } from '@/shared/ui/use-toast';

interface ConsultationDefaultsFieldsProps {
  profile: DoctorProfile;
}

/**
 * Doctor Settings Rebuild, Phase 6: `maxFreeSlotsPerDay` (already existed
 * end-to-end, just unexposed), plus the two real Phase 0 capabilities
 * (`bufferMinutesOverride`, `autoApproveFreeBookings`) -- mirrors
 * `doctor-profile-form.tsx`'s exact save/dirty-tracking pattern (Save
 * enabled only when `isDirty`, full-form submit through the same
 * profile-update mutation, error rendered inline from the mutation's own
 * `error`). Unlike that full-page form, this is one small section inside a
 * larger Settings page -- no `useUnsavedChangesGuard` here, matching this
 * same page's `AccountSecuritySection` phone field, which doesn't warn on
 * navigation away either for the same reason: a small, quick-to-redo field
 * grid, not a long multi-section edit a doctor would be devastated to lose.
 *
 * Split into an inner component that only mounts once `profile` is loaded,
 * so `useForm`'s `defaultValues` are seeded once from real data -- mirrors
 * `DoctorProfileForm`'s own prop-gated pattern (its parent page only renders
 * it once the profile query has resolved) rather than reset()-ing an
 * initially-empty form after the fact.
 */
function ConsultationDefaultsFields({ profile }: ConsultationDefaultsFieldsProps) {
  const t = useTranslations('doctor.settingsPage.consultationDefaults');
  const tValidation = useTranslations('doctor.settingsPage.consultationDefaults.validation');
  const updateProfile = useUpdateDoctorProfile();

  const form = useForm<ConsultationDefaultsFormValues>({
    // `createConsultationDefaultsSchema`'s `z.preprocess` (empty-string ->
    // `undefined`, before `z.coerce.number()` ever runs -- see the schema's
    // own doc comment) makes zod report a widened `unknown` *input* type
    // distinct from its `number | undefined` *output* type. `zodResolver`'s
    // inferred type reflects that split, but `useForm` here is deliberately
    // typed by the single, simpler *output* shape (matching every value this
    // component actually reads/writes: `defaultValues`, `field.value`, the
    // submitted payload) rather than threading a second, input-side generic
    // through every `FormField` below purely to satisfy the resolver's own
    // internal typing -- a well-known, narrowly-scoped zodResolver +
    // preprocess mismatch, not a real runtime concern.
    resolver: zodResolver(createConsultationDefaultsSchema(tValidation)) as Resolver<ConsultationDefaultsFormValues>,
    defaultValues: {
      maxFreeSlotsPerDay: profile.maxFreeSlotsPerDay,
      bufferMinutesOverride: profile.bufferMinutesOverride,
      autoApproveFreeBookings: profile.autoApproveFreeBookings,
    },
  });

  async function onSubmit(values: ConsultationDefaultsFormValues) {
    try {
      await updateProfile.mutateAsync(values);
      toast({ description: t('saveSuccess'), variant: 'success' });
      form.reset(values);
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
          name="maxFreeSlotsPerDay"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('maxFreeSlotsPerDayLabel')}</FormLabel>
              <FormControl>
                <Input type="number" min={0} step={1} {...field} value={field.value ?? ''} />
              </FormControl>
              <p className="text-xs text-text-secondary">{t('maxFreeSlotsPerDayHelp')}</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bufferMinutesOverride"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('bufferMinutesOverrideLabel')}</FormLabel>
              <FormControl>
                <Input type="number" min={0} step={1} {...field} value={field.value ?? ''} />
              </FormControl>
              <p className="text-xs text-text-secondary">{t('bufferMinutesOverrideHelp')}</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="autoApproveFreeBookings"
          render={({ field }) => (
            <FormItem>
              <label className="flex items-start gap-2">
                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-text-primary">{t('autoApproveLabel')}</span>
                  <span className="text-xs text-text-secondary">{t('autoApproveHelp')}</span>
                </span>
              </label>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" loading={updateProfile.isPending} disabled={!form.formState.isDirty} className="self-start">
          {t('save')}
        </Button>
      </form>
    </Form>
  );
}

/**
 * Fetches its own doctor profile (mirrors `AccountSecuritySection`'s own
 * `useMyAccount()` self-fetch) rather than requiring the assembling
 * `doctor-settings-form.tsx` to thread one down -- keeps each Settings
 * section independently self-sufficient. Renders nothing once loaded if the
 * caller genuinely has no doctor profile yet (shouldn't happen on this
 * doctor-only page, but mirrors `useDoctorProfile`'s own honest `null` for
 * "no profile" rather than crashing on it).
 */
export function ConsultationDefaultsForm() {
  const t = useTranslations('doctor.settingsPage.consultationDefaults');
  const { data: profile, isLoading } = useDoctorProfile();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : profile ? (
          <ConsultationDefaultsFields profile={profile} />
        ) : null}
      </CardContent>
    </Card>
  );
}
