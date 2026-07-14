export const NOTIFICATIONS_PATHS = {
  list: '/notifications',
  markRead: (id: string) => `/notifications/${id}/read`,
  markAllRead: '/notifications/read-all',
} as const;
