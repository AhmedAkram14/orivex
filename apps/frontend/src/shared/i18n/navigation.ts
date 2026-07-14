import { createNavigation } from 'next-intl/navigation';
import { routing } from '@/shared/i18n/routing';

/**
 * Locale-aware Link/redirect/usePathname/useRouter — per Phase 3.4.1's
 * architecture decision, every internal navigation must go through these
 * (not next/link or next/navigation directly), so no page can accidentally
 * link to an unlocalized path.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
