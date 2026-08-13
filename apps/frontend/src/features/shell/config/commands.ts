import { LayoutDashboard, LogOut, Monitor, Moon, ShieldAlert, Sun, type LucideIcon } from 'lucide-react';

export type CommandGroup = 'navigation' | 'actions';

export interface CommandDefinition {
  id: string;
  /** Key into `shell.commandPalette.commands`. */
  labelKey: string;
  icon: LucideIcon;
  group: CommandGroup;
  /** Present for `navigation` commands; `actions` commands are handled by id in `CommandPalette`'s `onSelect` (they need hooks — `useTheme`/`useLogout` — that can't live in static config). */
  href?: string;
}

/**
 * Every command the palette can execute — real navigation and real
 * account actions only, same as `QuickActions`. No business-entity search
 * results here yet — a real search endpoint (Doctors/Patients/Appointments)
 * is real, not-yet-built work (see the roadmap's Search phase); this is
 * the command/navigation architecture that phase will add real search
 * results alongside, not a stand-in pretending to be one.
 */
export const COMMANDS: CommandDefinition[] = [
  { id: 'nav-dashboard', labelKey: 'dashboard', icon: LayoutDashboard, group: 'navigation', href: '/dashboard' },
  { id: 'nav-security', labelKey: 'security', icon: ShieldAlert, group: 'navigation', href: '/security' },
  { id: 'action-theme-light', labelKey: 'themeLight', icon: Sun, group: 'actions' },
  { id: 'action-theme-dark', labelKey: 'themeDark', icon: Moon, group: 'actions' },
  { id: 'action-theme-system', labelKey: 'themeSystem', icon: Monitor, group: 'actions' },
  { id: 'action-sign-out', labelKey: 'signOut', icon: LogOut, group: 'actions' },
];
