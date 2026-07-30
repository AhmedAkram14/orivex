'use client';

import { Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Icon } from '@/shared/icons/icon';
import { usePathname, useRouter } from '@/shared/i18n/navigation';
import { routing, type AppLocale } from '@/shared/i18n/routing';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

/**
 * A real locale switch -- next-intl's route-based `[locale]` segment
 * (`shared/i18n/routing.ts`) already serves both `en` and `ar` in full, this
 * just exposes that existing capability from the landing footer rather than
 * requiring a visitor to hand-edit the URL.
 */
export function LandingLocaleSwitcher() {
  const t = useTranslations('common.locales');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border-default bg-surface px-4 py-2 text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
        <Icon icon={Globe} size="sm" />
        {t(locale)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(value) => router.replace(pathname, { locale: value as AppLocale })}
        >
          {routing.locales.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {t(option)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
