'use client';

import { LayoutDashboard, LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLogout } from '@/features/auth/hooks/use-logout';
import type { AuthenticatedUser } from '@/shared/auth/types';
import { Icon } from '@/shared/icons/icon';
import { Link, useRouter } from '@/shared/i18n/navigation';
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

/**
 * The landing navbar's signed-in state -- replaces the Sign in/Register
 * buttons once a session exists. Mirrors `features/shell/components/
 * user-menu.tsx` (theme selection + sign out reuse its exact translation
 * keys, `shell.userMenu.*`, rather than duplicating those strings), but
 * leads with "Go to Dashboard" instead of a Security Center shortcut --
 * the landing page isn't part of the authenticated shell, so getting back
 * into it is the one genuinely new action this menu needs to offer.
 */
export function LandingUserMenu({ user }: { user: AuthenticatedUser }) {
  const t = useTranslations('landing.nav');
  const tUserMenu = useTranslations('shell.userMenu');
  const { theme, setTheme } = useTheme();
  const logout = useLogout();
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
        <Avatar size="sm">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
          <AvatarFallback>{initialsFor(user.fullName)}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium text-text-primary sm:inline">{user.fullName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium text-text-primary">{user.fullName}</span>
            <span className="font-normal text-text-tertiary">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Icon icon={LayoutDashboard} size="sm" />
            {t('goToDashboard')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{tUserMenu('theme.label')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
          <DropdownMenuRadioItem value="light">
            <Icon icon={Sun} size="sm" className="me-2" />
            {tUserMenu('theme.light')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Icon icon={Moon} size="sm" className="me-2" />
            {tUserMenu('theme.dark')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Icon icon={Monitor} size="sm" className="me-2" />
            {tUserMenu('theme.system')}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            logout.mutate(undefined, { onSuccess: () => router.replace('/login') });
          }}
          className="text-danger data-[highlighted]:bg-danger-subtle data-[highlighted]:text-danger-emphasis"
        >
          <Icon icon={LogOut} size="sm" className="me-2" />
          {tUserMenu('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
