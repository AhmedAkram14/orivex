'use client';

import { useLocale } from 'next-intl';
import { isRtlLocale } from '@/shared/i18n/routing';

/**
 * The active locale's reading direction, the same one `<html dir>` gets. Radix primitives don't read
 * `<html dir>`: without an explicit `dir` they assume LTR and stamp `dir="ltr"` on their own root, so
 * in Arabic a tab panel, menu or select laid itself out left-to-right. The shared wrappers pass this.
 */
export function useDirection(): 'ltr' | 'rtl' {
  return isRtlLocale(useLocale()) ? 'rtl' : 'ltr';
}
