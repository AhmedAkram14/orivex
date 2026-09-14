import { LayoutDashboard, LogOut, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';

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
 * The palette's non-navigation commands (real account actions only) plus
 * the one navigation entry with no `NAVIGATION_CONFIG` entry of its own:
 * `/dashboard`, kept only as a defensive redirect target (see that config's
 * own comment), not sidebar-reachable. Every other navigable destination —
 * Schedule, Queue, Patients, Settings, Security, all of it — comes from
 * `NAVIGATION_CONFIG` itself via `flattenNavLeaves` in `CommandPalette`, so
 * the palette can never drift out of sync with the real sidebar the way a
 * second hand-maintained list did.
 */
export const COMMANDS: CommandDefinition[] = [
  { id: 'nav-dashboard', labelKey: 'dashboard', icon: LayoutDashboard, group: 'navigation', href: '/dashboard' },
  { id: 'action-theme-light', labelKey: 'themeLight', icon: Sun, group: 'actions' },
  { id: 'action-theme-dark', labelKey: 'themeDark', icon: Moon, group: 'actions' },
  { id: 'action-theme-system', labelKey: 'themeSystem', icon: Monitor, group: 'actions' },
  { id: 'action-sign-out', labelKey: 'signOut', icon: LogOut, group: 'actions' },
];
