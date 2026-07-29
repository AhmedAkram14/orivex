'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AUTH_ERROR_CODES } from '@/features/auth/api/types';
import { useLogin } from '@/features/auth/hooks/use-login';
import { useResendVerification } from '@/features/auth/hooks/use-resend-verification';
import { createLoginSchema, type LoginFormValues } from '@/features/auth/schemas/login.schema';
import { Link, useRouter } from '@/shared/i18n/navigation';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

/**
 * Talks only to `useLogin` (features/auth/hooks) — never to `authApi` or
 * `apiFetch` directly, per this feature's own API-layer boundary. Reacts
 * to the mock backend's distinct error codes (Account Locked routes away
 * entirely; Email Not Verified surfaces an inline resend action; Too Many
 * Attempts and Invalid Credentials show inline, since the user should stay
 * on this page and try again).
 */
export function LoginForm() {
  const t = useTranslations('auth.login');
  const tValidation = useTranslations('auth.validation');
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();
  const resendVerification = useResendVerification();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  // Public Landing Page (2026-07-29): RequireAuth/`/unauthorized` forward a
  // `?returnTo=` when a signed-out visitor followed a real deep link (e.g. a
  // specialty picked on the landing page) -- honored only when it's a
  // same-site relative path, never followed blindly (an open-redirect guard,
  // not just a UX nicety).
  const returnTo = searchParams.get('returnTo');
  const safeReturnTo = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : null;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(createLoginSchema(tValidation)),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  async function onSubmit(values: LoginFormValues) {
    setUnverifiedEmail(null);
    try {
      await login.mutateAsync(values);
      router.push(safeReturnTo ?? '/dashboard');
    } catch (error) {
      if (error instanceof ApiError && error.code === AUTH_ERROR_CODES.accountLocked) {
        router.push('/account-locked');
        return;
      }
      if (error instanceof ApiError && error.code === AUTH_ERROR_CODES.emailNotVerified) {
        setUnverifiedEmail(values.email);
      }
    }
  }

  const inlineError = login.error instanceof ApiError && !unverifiedEmail ? login.error : null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {inlineError && (
          <Alert variant="danger" role="alert">
            {inlineError.code === AUTH_ERROR_CODES.tooManyAttempts ? t('tooManyAttempts') : inlineError.message}
          </Alert>
        )}
        {unverifiedEmail && (
          <Alert variant="warning" title={t('emailNotVerifiedTitle')}>
            <div className="flex flex-col gap-2">
              <p>{t('emailNotVerifiedDescription')}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                loading={resendVerification.isPending}
                onClick={() => resendVerification.mutate({ email: unverifiedEmail })}
                className="self-start"
              >
                {t('resendVerification')}
              </Button>
              {resendVerification.isSuccess && (
                <p className="text-xs text-success">{t('resendVerificationSent')}</p>
              )}
            </div>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('emailLabel')}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder={t('emailPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>{t('passwordLabel')}</FormLabel>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  {t('forgotPasswordLink')}
                </Link>
              </div>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rememberMe"
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              {t('rememberMe')}
            </label>
          )}
        />
        <Button type="submit" loading={login.isPending}>
          {t('submit')}
        </Button>
      </form>
    </Form>
  );
}
