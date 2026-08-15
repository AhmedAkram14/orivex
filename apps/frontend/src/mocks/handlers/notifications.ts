import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { NOTIFICATIONS_PATHS } from '@/features/notifications/api/paths';
import { getNotificationsPage, markAllNotificationsAsRead, markNotificationAsRead } from '@/mocks/notifications-store';

const base = () => env.apiBaseUrl;

export const notificationHandlers = [
  // Every route below is a real endpoint (NotificationModule's
  // NotificationController) -- these handlers exist purely to keep the
  // frontend test suite deterministic, matching `patient.ts`/`scheduling.ts`.
  // Honors real page/limit query params (Notification Center pagination
  // fix), defaults matching the real backend's (page 1, limit 50) -- and
  // puts page/limit/total on `meta`, matching the real NotificationController
  // (`envelope(items, { page, limit, total })`), not `data`.
  http.get(`${base()}${NOTIFICATIONS_PATHS.list}`, ({ request }) => {
    const url = new URL(request.url);
    const page = url.searchParams.has('page') ? Number(url.searchParams.get('page')) : 1;
    const limit = url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : 50;
    const { items, total } = getNotificationsPage(page, limit);
    return HttpResponse.json({
      data: items,
      meta: { requestId: 'mock-request', timestamp: new Date().toISOString(), page, limit, total },
    });
  }),

  http.post(`${base()}/notifications/:id/read`, ({ params }) => {
    markNotificationAsRead(params.id as string);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base()}${NOTIFICATIONS_PATHS.markAllRead}`, () => {
    markAllNotificationsAsRead();
    return new HttpResponse(null, { status: 204 });
  }),
];
