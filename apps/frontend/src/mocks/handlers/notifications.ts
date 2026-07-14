import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { NOTIFICATIONS_PATHS } from '@/features/notifications/api/paths';
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '@/mocks/notifications-store';

const base = () => env.apiBaseUrl;

export const notificationHandlers = [
  http.get(`${base()}${NOTIFICATIONS_PATHS.list}`, () => HttpResponse.json({ data: getNotifications() })),

  http.post(`${base()}/notifications/:id/read`, ({ params }) => {
    markNotificationAsRead(params.id as string);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base()}${NOTIFICATIONS_PATHS.markAllRead}`, () => {
    markAllNotificationsAsRead();
    return new HttpResponse(null, { status: 204 });
  }),
];
