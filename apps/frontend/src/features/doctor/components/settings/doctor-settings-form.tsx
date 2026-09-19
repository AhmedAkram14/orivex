'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Heading } from '@/design-system/typography';
import { usePathname, useRouter } from '@/shared/i18n/navigation';
import { localeNativeNames, routing, type AppLocale } from '@/shared/i18n/routing';
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
      {/* WorkspaceHeader renders the page's H1; Card's CardTitle renders a
          real h3 -- without a real H2 between them the outline skips a
          level, the same fault already fixed on Disputes/Reports/Knowledge
          Center. */}
      <Heading as="h2" level={4}>
        {t('preferencesHeading')}
      </Heading>
      <Card>
        <CardHeader>
          <CardTitle>{t('theme.title')}</CardTitle>
          <CardDescription>{t('theme.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {/*
           * Radix's RadioGroupItem renders a <button role="radio">, which is
           * NOT a labelable element (only input/select/textarea/meter/
           * progress/output are) -- wrapping it in a <label> looks correct
           * but names nothing, forwards no clicks, and leaves the group
           * itself unnamed too. Fixed here by: an aria-label on the group
           * itself, aria-labelledby on each item pointing at its own visible
           * text span, and making the whole row a real click target via
           * onClick instead of relying on label-forwarding.
           */}
          <RadioGroup
            value={theme}
            onValueChange={(value) => setTheme(value as Theme)}
            className="flex flex-col gap-3"
            aria-label={t('theme.title')}
          >
            {(['light', 'dark', 'system'] as const).map((option) => {
              const OptionIcon = themeIcons[option];
              const labelId = `theme-${option}-label`;
              return (
                <div
                  key={option}
                  className="flex cursor-pointer items-center gap-3 text-sm text-text-primary"
                  onClick={() => setTheme(option)}
                >
                  <RadioGroupItem value={option} id={`theme-${option}`} aria-labelledby={labelId} />
                  <Icon icon={OptionIcon} size="sm" className="text-text-secondary" />
                  <span id={labelId}>{tThemeMenu(option)}</span>
                </div>
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
            aria-label={t('language.title')}
          >
            {routing.locales.map((option) => {
              const labelId = `language-${option}-label`;
              return (
                <div
                  key={option}
                  className="flex cursor-pointer items-center gap-3 text-sm text-text-primary"
                  onClick={() => router.replace(pathname, { locale: option })}
                >
                  <RadioGroupItem value={option} id={`language-${option}`} aria-labelledby={labelId} />
                  {/*
                   * Each language names itself, in its own script, regardless
                   * of the current UI language -- "العربية" must read
                   * "العربية" even on the English page, not "Arabic", so
                   * someone who can't read the active UI language can still
                   * find theirs. Not translated via `t()` on purpose.
                   */}
                  <span id={labelId}>{localeNativeNames[option]}</span>
                </div>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
