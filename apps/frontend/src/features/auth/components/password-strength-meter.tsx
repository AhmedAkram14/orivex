import { useTranslations } from 'next-intl';
import { getPasswordStrength } from '@/features/auth/lib/password-strength';
import { cn } from '@/shared/lib/cn';

export interface PasswordStrengthMeterProps {
  password: string;
}

const BAR_COUNT = 4;

const colorByScore: Record<number, string> = {
  0: 'bg-danger',
  1: 'bg-danger',
  2: 'bg-warning',
  3: 'bg-success',
  4: 'bg-success',
};

/**
 * Visual + accessible strength indicator. The label change is announced
 * via `aria-live="polite"` (screen-reader users get "Password strength:
 * strong" the same way sighted users get the color/fill change) — color
 * alone never carries the only signal, per this phase's WCAG 2.2 AA bar.
 */
export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const t = useTranslations('auth.passwordStrength');
  if (!password) return null;

  const { score, label } = getPasswordStrength(password);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1" role="presentation">
        {Array.from({ length: BAR_COUNT }, (_, index) => (
          <div
            key={index}
            className={cn(
              'h-1.5 flex-1 rounded-full bg-neutral-subtle transition-colors duration-(--duration-fast)',
              index < score && colorByScore[score],
            )}
          />
        ))}
      </div>
      <p className="text-xs text-text-secondary" aria-live="polite">
        {t('label', { strength: t(`levels.${label}`) })}
      </p>
    </div>
  );
}
