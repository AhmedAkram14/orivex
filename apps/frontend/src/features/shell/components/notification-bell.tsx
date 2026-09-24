'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { NotificationPanel } from '@/features/shell/components/notification-panel';
import { useMarkAllNotificationsRead } from '@/features/notifications/hooks/use-mark-all-notifications-read';
import { useUnreadNotificationCount } from '@/features/notifications/hooks/use-unread-notification-count';
import { Icon } from '@/shared/icons/icon';
import { Badge } from '@/shared/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';

/** The Topbar's notification entry point — a bell with an unread-count badge, opening `NotificationPanel` in a popover. Mounted once in `AppShell`, alongside `CommandPalette` and `UserMenu`. */
export function NotificationBell() {
  const t = useTranslations('shell.notifications');
  const unreadCount = useUnreadNotificationCount();
  const markAllAsRead = useMarkAllNotificationsRead();

  return (
    // Opening the bell counts as having seen the notifications: everything is
    // marked read and the badge clears (a click on an individual item still
    // navigates as before).
    <Popover
      onOpenChange={(open) => {
        if (open && unreadCount > 0 && !markAllAsRead.isPending) markAllAsRead.mutate();
      }}
    >
      <PopoverTrigger
        className="relative rounded-md p-2 text-text-secondary transition-colors duration-(--duration-fast) hover:bg-secondary-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
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
