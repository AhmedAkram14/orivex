'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/shared/i18n/navigation';
import { routing, type AppLocale } from '@/shared/i18n/routing';
import { useTheme, type Theme } from '@/shared/providers/theme-provider';
import { Icon } from '@/shared/icons/icon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';

const themeIcons: Record<Theme, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };

/**
 * The Doctor Workspace's "Settings" page — two genuinely functional
 * preferences, nothing decorative:
 *
 * - Theme: the same real global `useTheme()`/`data-theme` mechanism
 *   `UserMenu` already drives.
 * - Language: `Account.preferredLanguage` (`GET /accounts/me`) has no
 *   update endpoint on the backend today — `UpdatePersonalProfileRequestDto`
 *   only accepts `dateOfBirth`/`gender`/`nationalityId`/`address`
 *   (`features/identity/api/types.ts`). Rather than fabricate a mutation
 *   the backend can't actually persist, this reuses the app's real,
 *   already-working language mechanism instead: next-intl's route-based
 *   `[locale]` segment, the same one `LandingLocaleSwitcher` exposes.
 *   Switching it here genuinely changes the rendered language app-wide.
 */
export function DoctorSettingsForm() {
  const t = useTranslations('doctor.settingsPage');
  const tThemeMenu = useTranslations('shell.userMenu.theme');
  const { theme, setTheme } = useTheme();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('theme.title')}</CardTitle>
          <CardDescription>{t('theme.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)} className="flex flex-col gap-3">
            {(['light', 'dark', 'system'] as const).map((option) => {
              const OptionIcon = themeIcons[option];
              return (
                <label key={option} className="flex items-center gap-3 text-sm text-text-primary">
                  <RadioGroupItem value={option} id={`theme-${option}`} />
                  <Icon icon={OptionIcon} size="sm" className="text-text-secondary" />
                  <span>{tThemeMenu(option)}</span>
                </label>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('language.title')}</CardTitle>
          <CardDescription>{t('language.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={locale}
            onValueChange={(value) => router.replace(pathname, { locale: value as AppLocale })}
            className="flex flex-col gap-3"
          >
            {routing.locales.map((option) => (
              <label key={option} className="flex items-center gap-3 text-sm text-text-primary">
                <RadioGroupItem value={option} id={`language-${option}`} />
                <span>{t(`language.options.${option}`)}</span>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
