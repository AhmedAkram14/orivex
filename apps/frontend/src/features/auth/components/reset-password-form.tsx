'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { AUTH_ERROR_CODES } from '@/features/auth/api/types';
import { useResetPassword } from '@/features/auth/hooks/use-reset-password';
import { PasswordStrengthMeter } from '@/features/auth/components/password-strength-meter';
import {
  createResetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/features/auth/schemas/reset-password.schema';
import { Link, useRouter } from '@/shared/i18n/navigation';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

export interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const t = useTranslations('auth.resetPassword');
  const tValidation = useTranslations('auth.validation');
  const router = useRouter();
  const resetPassword = useResetPassword();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(createResetPasswordSchema(tValidation)),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const password = form.watch('password');

  async function onSubmit(values: ResetPasswordFormValues) {
    try {
      await resetPassword.mutateAsync({ token, password: values.password });
      router.push('/login');
    } catch {
      // Inline error rendered below from `resetPassword.error`.
    }
  }

  const tokenIssue =
    resetPassword.error instanceof ApiError &&
    (resetPassword.error.code === AUTH_ERROR_CODES.tokenExpired ||
      resetPassword.error.code === AUTH_ERROR_CODES.tokenInvalid);

  if (tokenIssue) {
    return (
      <Alert variant="danger" title={t('invalidLinkTitle')}>
        <div className="flex flex-col gap-2">
          <p>{t('invalidLinkDescription')}</p>
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            {t('requestNewLink')}
          </Link>
        </div>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {resetPassword.error instanceof ApiError && (
          <Alert variant="danger" role="alert">
            {resetPassword.error.message}
          </Alert>
        )}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('passwordLabel')}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <PasswordStrengthMeter password={password} />
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
        <Button type="submit" loading={resetPassword.isPending}>
          {t('submit')}
        </Button>
      </form>
    </Form>
  );
}
