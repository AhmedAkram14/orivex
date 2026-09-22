'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { AUTH_ERROR_CODES } from '@/features/auth/api/types';
import { useChangePassword } from '@/features/auth/hooks/use-change-password';
import { PasswordStrengthMeter } from '@/features/auth/components/password-strength-meter';
import {
  createChangePasswordSchema,
  type ChangePasswordFormValues,
} from '@/features/auth/schemas/change-password.schema';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

/**
 * Doctor Settings Rebuild, Phase 5: mirrors `ResetPasswordForm`'s exact
 * shape (react-hook-form + zod, `PasswordStrengthMeter` on the new-password
 * field), plus a `currentPassword` field this authenticated flow alone
 * needs. On success the form clears (mirrors `DoctorProfileForm`-style
 * "reset after save", appropriate here since there's no reason to keep a
 * just-changed password's old and new values sitting in the fields).
 */
export function ChangePasswordForm() {
  const t = useTranslations('auth.changePassword');
  const tValidation = useTranslations('auth.validation');
  const changePassword = useChangePassword();

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(createChangePasswordSchema(tValidation)),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPassword = form.watch('newPassword');

  async function onSubmit(values: ChangePasswordFormValues) {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      form.reset();
    } catch {
      // Inline error rendered below from `changePassword.error`.
    }
  }

  // ChangePasswordUseCase throws the same InvalidCredentialsError a wrong
  // login does ("Invalid email or password.") -- accurate for login, but
  // confusing on a form with no email field. Give this specific failure a
  // clearer, change-password-scoped message instead of the generic one.
  const wrongCurrentPassword =
    changePassword.error instanceof ApiError && changePassword.error.code === AUTH_ERROR_CODES.invalidCredentials;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {changePassword.error instanceof ApiError && (
          <Alert variant="danger" role="alert">
            {wrongCurrentPassword ? t('wrongCurrentPassword') : changePassword.error.message}
          </Alert>
        )}
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('currentPasswordLabel')}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('newPasswordLabel')}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <PasswordStrengthMeter password={newPassword} />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('confirmPasswordLabel')}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" loading={changePassword.isPending} className="self-start">
          {t('submit')}
        </Button>
      </form>
    </Form>
  );
}
