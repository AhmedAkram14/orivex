'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { useRegister } from '@/features/auth/hooks/use-register';
import { PasswordStrengthMeter } from '@/features/auth/components/password-strength-meter';
import { createRegisterSchema, type RegisterFormValues } from '@/features/auth/schemas/register.schema';
import { useRouter } from '@/shared/i18n/navigation';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

export function RegisterForm() {
  const t = useTranslations('auth.register');
  const tValidation = useTranslations('auth.validation');
  const router = useRouter();
  const register = useRegister();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(createRegisterSchema(tValidation)),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const password = form.watch('password');

  async function onSubmit(values: RegisterFormValues) {
    try {
      await register.mutateAsync({ fullName: values.fullName, email: values.email, password: values.password });
      router.push(`/check-email?email=${encodeURIComponent(values.email)}&reason=register`);
    } catch {
      // Inline error rendered below from `register.error` -- no further action needed here.
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {register.error instanceof ApiError && (
          <Alert variant="danger" role="alert">
            {register.error.message}
          </Alert>
        )}
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fullNameLabel')}</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder={t('fullNamePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        <Button type="submit" loading={register.isPending}>
          {t('submit')}
        </Button>
      </form>
    </Form>
  );
}
