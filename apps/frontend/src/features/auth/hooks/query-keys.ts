import { createQueryKeyFactory } from '@/shared/lib/api/query-keys';

/** Session state — one logical record, addressed via `.detail('current')` so it participates in the same invalidation helpers as list/detail-shaped data. */
export const sessionKeys = createQueryKeyFactory('auth-session');

export const deviceSessionKeys = createQueryKeyFactory('auth-device-sessions');

export const loginHistoryKeys = createQueryKeyFactory('auth-login-history');
