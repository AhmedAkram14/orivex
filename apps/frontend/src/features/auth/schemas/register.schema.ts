import { z } from 'zod';
import { isPasswordStrongEnough, MIN_PASSWORD_LENGTH } from '@/features/auth/lib/password-strength';

export function createRegisterSchema(t: (key: string, values?: Record<string, unknown>) => string) {
  return z
    .object({
      fullName: z.string().min(2, t('fullNameRequired')),
      email: z.string().min(1, t('emailRequired')).email(t('emailInvalid')),
      password: z
        .string()
        .min(MIN_PASSWORD_LENGTH, t('passwordTooShort', { min: MIN_PASSWORD_LENGTH }))
        .refine(isPasswordStrongEnough, t('passwordTooWeak')),
      confirmPassword: z.string().min(1, t('confirmPasswordRequired')),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: t('passwordsDoNotMatch'),
      path: ['confirmPassword'],
    });
}

export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;
