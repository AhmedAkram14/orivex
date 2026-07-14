'use client';

import { LogOut, Monitor, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { useAuth } from '@/shared/auth/auth-context';
import { Icon } from '@/shared/icons/icon';
import { Link, useRouter } from '@/shared/i18n/navigation';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
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

/** The Topbar's trailing avatar + dropdown — account identity, theme selection, Security Center shortcut, and sign out. Every label routes through `shell.userMenu`; nothing here assumes a specific role. */
export function UserMenu() {
  const t = useTranslations('shell.userMenu');
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const logout = useLogout();
  const router = useRouter();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
        <Avatar size="sm">
          <AvatarFallback>{initialsFor(user.fullName)}</AvatarFallback>
        </Avatar>
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
        <DropdownMenuItem
          onSelect={() => {
            logout.mutate(undefined, { onSuccess: () => router.replace('/login') });
          }}
          className="text-danger data-[highlighted]:bg-danger-subtle"
        >
          <Icon icon={LogOut} size="sm" className="me-2" />
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
