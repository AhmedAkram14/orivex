'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { COMMANDS, type CommandDefinition } from '@/features/shell/config/commands';
import { useCommandPalette } from '@/features/shell/hooks/use-command-palette';
import { getRecentCommandIds, recordRecentCommand } from '@/features/shell/lib/recent-searches';
import { useAuth } from '@/shared/auth/auth-context';
import { useRouter } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { useTheme, type Theme } from '@/shared/providers/theme-provider';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/command';

const THEME_ACTION_IDS: Record<string, Theme> = {
  'action-theme-light': 'light',
  'action-theme-dark': 'dark',
  'action-theme-system': 'system',
};

/**
 * The global search / command palette — a self-contained unit (trigger
 * button + dialog + ⌘K shortcut) mounted once in `AppShell`'s Topbar.
 * Lists real navigation and account actions only (`COMMANDS`); business
 * search results are Phase 18's scope, blocked on a real search endpoint
 * — this is the placeholder architecture that phase will plug into, not
 * a fake search result list.
 */
export function CommandPalette() {
  const t = useTranslations('shell.commandPalette');
  const tNav = useTranslations('shell.nav');
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const { setTheme } = useTheme();
  const logout = useLogout();
  const recentIds = getRecentCommandIds();
  const { user } = useAuth();
  const isDoctor = user?.roles.includes('doctor') ?? false;

  function handleSelect(command: CommandDefinition) {
    recordRecentCommand(command.id);
    setOpen(false);

    if (command.href) {
      router.push(command.href);
      return;
    }
    if (command.id in THEME_ACTION_IDS) {
      setTheme(THEME_ACTION_IDS[command.id]);
      return;
    }
    if (command.id === 'action-sign-out') {
      logout.mutate(undefined, { onSuccess: () => router.replace('/login') });
    }
  }

  const recentCommands = recentIds
    .map((id) => COMMANDS.find((command) => command.id === id))
    .filter((command): command is CommandDefinition => command !== undefined);
  const navigationCommands = COMMANDS.filter((command) => command.group === 'navigation');
  const actionCommands = COMMANDS.filter((command) => command.group === 'actions');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border-default bg-canvas px-3 py-1.5 text-sm text-text-tertiary transition-colors duration-(--duration-fast) hover:bg-secondary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <Icon icon={Search} size="sm" />
        <span className="hidden sm:inline">{isDoctor ? t('triggerLabel') : t('triggerLabelPatient')}</span>
        <kbd className="hidden rounded border border-border-default bg-surface px-1.5 py-0.5 text-xs sm:inline">
          {t('shortcutHint')}
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t('inputPlaceholder')} />
        <CommandList>
          <CommandEmpty>{t('noResults')}</CommandEmpty>
          {recentCommands.length > 0 && (
            <CommandGroup heading={t('recentHeading')}>
              {recentCommands.map((command) => (
                <CommandItem key={`recent-${command.id}`} onSelect={() => handleSelect(command)}>
                  <Icon icon={command.icon} size="sm" className="me-2" />
                  {command.group === 'navigation' ? tNav(command.labelKey) : t(`commands.${command.labelKey}`)}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading={t('navigationHeading')}>
            {navigationCommands.map((command) => (
              <CommandItem key={command.id} onSelect={() => handleSelect(command)}>
                <Icon icon={command.icon} size="sm" className="me-2" />
                {tNav(command.labelKey)}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading={t('actionsHeading')}>
            {actionCommands.map((command) => (
              <CommandItem key={command.id} onSelect={() => handleSelect(command)}>
                <Icon icon={command.icon} size="sm" className="me-2" />
                {t(`commands.${command.labelKey}`)}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
