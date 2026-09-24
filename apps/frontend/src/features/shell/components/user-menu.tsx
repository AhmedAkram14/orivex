'use client';

import { ChevronDown, Globe, LogOut, Monitor, Moon, Settings, ShieldCheck, Sun } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { useAuth } from '@/shared/auth/auth-context';
import { Icon } from '@/shared/icons/icon';
import { Link, usePathname, useRouter } from '@/shared/i18n/navigation';
import { localeNativeNames, routing, type AppLocale } from '@/shared/i18n/routing';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { useTheme, type Theme } from '@/shared/providers/theme-provider';

function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export interface UserMenuProps {
  /** Additive, default false (every existing caller's rendered trigger is unchanged) -- shows the account's name and a chevron next to the avatar, for contexts outside the dashboard Topbar (e.g. the Journey screen's own minimal header) where the plain icon-only trigger would look unlabeled. */
  showName?: boolean;
  /** Optional second line under the name (e.g. a doctor's specialty) -- only meaningful when `showName` is true. Omitted renders a single-line name, unchanged from before this prop existed. Never fabricated: callers only pass a subtitle they've resolved from real data. */
  subtitle?: string;
}

/** The Topbar's trailing avatar + dropdown — account identity, theme selection, Security Center shortcut, and sign out. Every label routes through `shell.userMenu`; nothing here assumes a specific role. */
export function UserMenu({ showName = false, subtitle }: UserMenuProps = {}) {
  const t = useTranslations('shell.userMenu');
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  if (!user) return null;

  const isDoctor = user.roles.includes('doctor');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
        <Avatar size="sm">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
          <AvatarFallback>{initialsFor(user.fullName)}</AvatarFallback>
        </Avatar>
        {showName && (
          <>
            {/* Responsive pass (Phase 7): this block used to be the thing that
                wrapped the doctor's name/specialty onto 2-3 lines and clipped
                the topbar's fixed h-14 height at narrow widths -- name/
                specialty are now dropdown-only below `sm` (see the
                DropdownMenuLabel subtitle line below); the chevron alone is
                enough affordance for "this opens a menu" next to the avatar. */}
            <span className="hidden flex-col items-start leading-tight sm:flex">
              <span className="text-sm font-medium text-text-primary">{user.fullName}</span>
              {subtitle && <span className="text-xs text-text-tertiary">{subtitle}</span>}
            </span>
            <Icon icon={ChevronDown} size="sm" className="text-text-tertiary" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium text-text-primary">{user.fullName}</span>
            {/* Only rendered here (not duplicated in the trigger) below `sm`,
                where the trigger's own name/subtitle block is hidden -- this
                is now the one place a narrow-viewport doctor sees their
                specialty at all, so it's shown unconditionally in the menu
                regardless of breakpoint rather than only "when the trigger
                hid it," which would make its presence depend on viewport
                width in a way that's hard to reason about here. */}
            {showName && subtitle && <span className="font-normal text-text-tertiary">{subtitle}</span>}
            <span className="font-normal text-text-tertiary">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isDoctor && (
          // Settings audit: the sidebar's Settings entry sits below the
          // fold at normal laptop heights, discoverable only via an inner
          // scrollbar most people never notice -- a persistent, always-
          // visible entry point here (same fix already applied to Security
          // Center below) means it never depends on scroll position.
          <DropdownMenuItem asChild>
            <Link href="/doctor/settings" className="flex items-center gap-2">
              <Icon icon={Settings} size="sm" />
              {t('settings')}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/security" className="flex items-center gap-2">
            <Icon icon={ShieldCheck} size="sm" />
            {t('securityCenter')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('theme.label')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
          <DropdownMenuRadioItem value="light">
            <Icon icon={Sun} size="sm" className="me-2" />
            {t('theme.light')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Icon icon={Moon} size="sm" className="me-2" />
            {t('theme.dark')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Icon icon={Monitor} size="sm" className="me-2" />
            {t('theme.system')}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        {/*
         * Language switch, reachable outside Settings -- reuses the exact
         * same route-based `[locale]` switching mechanism
         * `DoctorSettingsForm`'s own language section already established
         * (next-intl's `router.replace(pathname, { locale })`), not a
         * second, independently-invented locale mutation.
         */}
        <DropdownMenuLabel>{t('language.label')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(value) => router.replace(pathname, { locale: value as AppLocale })}
        >
          {routing.locales.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              <Icon icon={Globe} size="sm" className="me-2" />
              {localeNativeNames[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            logout.mutate(undefined, { onSuccess: () => router.replace('/login') });
          }}
          className="text-danger data-[highlighted]:bg-danger-subtle data-[highlighted]:text-danger-emphasis"
        >
          <Icon icon={LogOut} size="sm" className="me-2" />
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
