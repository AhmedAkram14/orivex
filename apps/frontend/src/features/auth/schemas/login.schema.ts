import { z } from 'zod';

/**
 * Schema factories take a translator (`useTranslations('auth.validation')`
 * in the calling form) rather than hardcoding English messages — Zod's
 * `message` strings are user-facing text, and this phase's "no hardcoded
 * strings" rule applies to validation errors exactly as much as it does to
 * static page copy.
 */
export function createLoginSchema(t: (key: string) => string) {
  return z.object({
    email: z.string().min(1, t('emailRequired')).email(t('emailInvalid')),
    password: z.string().min(1, t('passwordRequired')),
    rememberMe: z.boolean().optional(),
  });
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;
