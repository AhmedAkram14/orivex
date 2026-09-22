import { z } from 'zod';
import { isPasswordStrongEnough, MIN_PASSWORD_LENGTH } from '@/features/auth/lib/password-strength';

type Translate = (key: string, values?: Record<string, string | number | Date>) => string;

/**
 * Doctor Settings Rebuild, Phase 5: mirrors `createResetPasswordSchema`
 * exactly for the new-password/confirm-password pair (same
 * `isPasswordStrongEnough`/`MIN_PASSWORD_LENGTH` helper the backend's own
 * `PlainPassword.create` policy matches -- 10+ chars, an uppercase letter, a
 * lowercase letter, and a digit), plus a required `currentPassword` field
 * this form alone needs.
 */
export function createChangePasswordSchema(t: Translate) {
  return z
    .object({
      currentPassword: z.string().min(1, t('passwordRequired')),
      newPassword: z
        .string()
        .min(MIN_PASSWORD_LENGTH, t('passwordTooShort', { min: MIN_PASSWORD_LENGTH }))
        .refine(isPasswordStrongEnough, t('passwordTooWeak')),
      confirmPassword: z.string().min(1, t('confirmPasswordRequired')),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
      message: t('passwordsDoNotMatch'),
      path: ['confirmPassword'],
    });
}

export type ChangePasswordFormValues = z.infer<ReturnType<typeof createChangePasswordSchema>>;
