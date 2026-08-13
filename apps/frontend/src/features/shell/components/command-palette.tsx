'use client';

import { Calendar, Search, Stethoscope, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { COMMANDS, type CommandDefinition } from '@/features/shell/config/commands';
import { useCommandPalette } from '@/features/shell/hooks/use-command-palette';
import { getRecentCommandIds, recordRecentCommand } from '@/features/shell/lib/recent-searches';
import type { SearchResultDto, SearchResultType } from '@/features/search/api/types';
import { useGlobalSearch } from '@/features/search/hooks/use-global-search';
import { useAuth } from '@/shared/auth/auth-context';
import type { Role } from '@/shared/auth/types';
import { useRouter } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { useTheme, type Theme } from '@/shared/providers/theme-provider';
import { Alert } from '@/shared/ui/alert';
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

const RESULT_ICON: Record<SearchResultType, typeof Stethoscope> = {
  doctor: Stethoscope,
  patient: Users,
  appointment: Calendar,
};

/**
 * Per-role navigation target for a real search result (ORIVEX Roadmap
 * Phase 2's finalized decision table -- see the phase spec, not
 * re-litigated here). The backend already only returns types a given role
 * is allowed to see, so the only real branching left is *which* real page
 * a `patient`/`appointment` result lands on for a given viewer role. `null`
 * means "not navigable for this viewer" -- never reachable in practice
 * since the backend never returns a type outside a role's own list, but
 * kept honest rather than assuming.
 */
function resolveResultHref(result: SearchResultDto, roles: Role[]): string | null {
  if (result.type === 'doctor') return `/patient/doctors/${result.id}`;
  if (result.type === 'patient') {
    if (roles.includes('doctor')) return '/doctor/patients';
    if (roles.includes('super_admin')) return '/admin/users';
    return null;
  }
  if (roles.includes('patient')) return '/patient/appointments';
  if (roles.includes('doctor')) return '/doctor/queue';
  return null;
}

/**
 * The command palette — a self-contained unit (trigger button + dialog +
 * ⌘K shortcut) mounted once in `AppShell`'s Topbar. Lists real navigation
 * and account actions (`COMMANDS`) plus, once 2+ characters are typed, real
 * business-entity search results from `GET /search` (ORIVEX Roadmap Phase
 * 2 -- Real Global Search). The trigger/placeholder copy still deliberately
 * says "Search & commands" rather than naming specific entities -- it's
 * honest either way, not a claim that's now finally true.
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
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();
  const isSearchActive = trimmedQuery.length >= 2;
  const search = useGlobalSearch({ q: query });
  const searchResults = search.data?.results ?? [];
  const doctorResults = searchResults.filter((result) => result.type === 'doctor');
  const patientResults = searchResults.filter((result) => result.type === 'patient');
  const appointmentResults = searchResults.filter((result) => result.type === 'appointment');

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

  // Search results aren't `COMMANDS` entries, so `recordRecentCommand`
  // (which only ever stores/looks up static command ids) has nothing
  // meaningful to record here -- navigating away and closing the dialog is
  // the whole of a result's "selection" behavior.
  function handleSelectResult(result: SearchResultDto) {
    const href = resolveResultHref(result, user?.roles ?? []);
    setOpen(false);
    if (href) router.push(href);
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
        <CommandInput placeholder={t('inputPlaceholder')} onValueChange={setQuery} />
        <CommandList>
          {!isSearchActive && <CommandEmpty>{t('noResults')}</CommandEmpty>}

          {isSearchActive && search.isLoading && (
            <div className="py-6 text-center text-sm text-text-secondary">{t('searching')}</div>
          )}
          {isSearchActive && search.isError && (
            <div className="p-2">
              <Alert variant="danger">{t('searchError')}</Alert>
            </div>
          )}
          {isSearchActive && !search.isLoading && !search.isError && searchResults.length === 0 && (
            <div className="py-6 text-center text-sm text-text-secondary">
              {t('noResultsForQuery', { query: trimmedQuery })}
            </div>
          )}
          {doctorResults.length > 0 && (
            <CommandGroup heading={t('searchDoctorsHeading')}>
              {doctorResults.map((result) => (
                <CommandItem
                  key={`search-doctor-${result.id}`}
                  value={`search-doctor-${result.id}-${result.title}`}
                  onSelect={() => handleSelectResult(result)}
                >
                  <Icon icon={RESULT_ICON.doctor} size="sm" className="me-2 shrink-0" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{result.title}</span>
                    <span className="truncate text-xs text-text-tertiary">{result.subtitle}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {patientResults.length > 0 && (
            <CommandGroup heading={t('searchPatientsHeading')}>
              {patientResults.map((result) => (
                <CommandItem
                  key={`search-patient-${result.id}`}
                  value={`search-patient-${result.id}-${result.title}`}
                  onSelect={() => handleSelectResult(result)}
                >
                  <Icon icon={RESULT_ICON.patient} size="sm" className="me-2 shrink-0" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{result.title}</span>
                    <span className="truncate text-xs text-text-tertiary">{result.subtitle}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {appointmentResults.length > 0 && (
            <CommandGroup heading={t('searchAppointmentsHeading')}>
              {appointmentResults.map((result) => (
                <CommandItem
                  key={`search-appointment-${result.id}`}
                  value={`search-appointment-${result.id}-${result.title}`}
                  onSelect={() => handleSelectResult(result)}
                >
                  <Icon icon={RESULT_ICON.appointment} size="sm" className="me-2 shrink-0" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{result.title}</span>
                    <span className="truncate text-xs text-text-tertiary">{result.subtitle}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

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
