'use client';

import { CalendarDays, FileText, Pill, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';

/**
 * The redesigned "My Health" dashboard's Quick Actions — deliberately a
 * compact row of outline buttons, not the old 7-tile navigation grid that
 * used to dominate the lower half of the page. `viewProfile`/
 * `browseSpecialties` are still reachable from the sidebar, and
 * `becomeADoctor` moved to its own secondary `BecomeADoctorCta` — this list
 * is just the handful of actions a patient reaches for most often.
 */
export function PatientQuickActions() {
  const t = useTranslations('patient.dashboard.quickActions');

  const actions = [
    { id: 'book-appointment', label: t('bookAppointment'), icon: CalendarDays, href: '/patient/appointments/book' },
    { id: 'browse-doctors', label: t('browseDoctors'), icon: Search, href: '/patient/doctors' },
    { id: 'records', label: t('viewRecords'), icon: FileText, href: '/patient/records' },
    { id: 'prescriptions', label: t('viewPrescriptions'), icon: Pill, href: '/patient/prescriptions' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button key={action.id} asChild variant="outline" size="sm">
          <Link href={action.href}>
            <Icon icon={action.icon} size="sm" className="me-2" />
            {action.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
