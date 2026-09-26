'use client';

import { CalendarDays, CalendarRange, Contact, FileText, HeartPulse, MoreHorizontal, Search, Stethoscope, Users, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/auth/auth-context';
import { Icon } from '@/shared/icons/icon';
import { Link, usePathname } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';

interface BottomNavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  exact?: boolean;
}

const PATIENT_ITEMS: BottomNavItem[] = [
  { href: '/patient', labelKey: 'overview', icon: HeartPulse, exact: true },
  { href: '/patient/appointments', labelKey: 'patientAppointments', icon: CalendarDays },
  { href: '/patient/doctors', labelKey: 'patientDoctors', icon: Search },
  { href: '/patient/records', labelKey: 'patientRecords', icon: FileText },
];

const DOCTOR_ITEMS: BottomNavItem[] = [
  { href: '/doctor', labelKey: 'overview', icon: Stethoscope, exact: true },
  { href: '/doctor/queue', labelKey: 'doctorQueue', icon: Users },
  { href: '/doctor/schedule', labelKey: 'doctorSchedule', icon: CalendarRange },
  { href: '/doctor/patients', labelKey: 'doctorPatients', icon: Contact },
];

/** Whether the current role gets a phone bottom nav (patient and doctor; admin keeps the drawer only). */
export function useHasBottomNav(): boolean {
  const { user } = useAuth();
  return Boolean(user?.roles.includes('patient') || user?.roles.includes('doctor'));
}

/**
 * Below 768px: four role-specific destinations plus More (which opens the full
 * drawer). 56px tall targets, safe-area aware. The active item wears the same
 * pulse mark as the sidebar.
 */
export function BottomNav({ onMore }: { onMore: () => void }) {
  const t = useTranslations('shell.nav');
  const tChrome = useTranslations('chrome.bottomNav');
  const { user } = useAuth();
  const pathname = usePathname();
  const items = user?.roles.includes('doctor') ? DOCTOR_ITEMS : user?.roles.includes('patient') ? PATIENT_ITEMS : null;
  if (!items) return null;

  return (
    <nav
      aria-label={tChrome('label')}
      className="fixed inset-x-0 bottom-0 z-(--z-sticky) border-t border-border-default bg-surface md:hidden print-hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring aria-[current=page]:text-text-primary"
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-(--duration-fast)',
                    active && 'bg-pulse text-pulse-foreground',
                  )}
                >
                  <Icon icon={item.icon} size="md" />
                </span>
                <span className="max-w-full truncate text-caption">{t(item.labelKey)}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onMore}
            aria-label={tChrome('moreLabel')}
            className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring"
          >
            <span className="flex h-7 w-12 items-center justify-center rounded-full">
              <Icon icon={MoreHorizontal} size="md" />
            </span>
            <span className="text-caption">{tChrome('more')}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
