'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { NotificationPanel } from '@/features/shell/components/notification-panel';
import { useUnreadNotificationCount } from '@/features/notifications/hooks/use-unread-notification-count';
import { Icon } from '@/shared/icons/icon';
import { Badge } from '@/shared/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';

/** The Topbar's notification entry point — a bell with an unread-count badge, opening `NotificationPanel` in a popover. Mounted once in `AppShell`, alongside `CommandPalette` and `UserMenu`. */
export function NotificationBell() {
  const t = useTranslations('shell.notifications');
  const unreadCount = useUnreadNotificationCount();

  return (
    <Popover>
      <PopoverTrigger
        className="relative rounded-md p-2 text-text-secondary transition-colors hover:bg-secondary-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        aria-label={unreadCount > 0 ? t('bellLabelWithCount', { count: unreadCount }) : t('bellLabel')}
      >
        <Icon icon={Bell} size="md" />
        {unreadCount > 0 && (
          <Badge variant="danger" className="absolute -end-1 -top-1 min-w-4 justify-center px-1 py-0 text-[10px]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <NotificationPanel />
      </PopoverContent>
    </Popover>
  );
}
