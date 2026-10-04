'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { EarningsRange } from '@/features/payment/lib/earnings';
import { usePathname, useRouter } from '@/shared/i18n/navigation';
import { ALL_TIME_START_ISO, getLast30DaysRange } from '@/shared/ui/date-range-picker';

/**
 * The Earnings page's range, shared by its header (Export CSV) and its body: seeded once from `?dateFrom=&dateTo=`
 * (last 30 days when absent), and every change written back with `router.replace` (never `push`, so moving the range
 * doesn't fill the browser history). "All time" is open-ended: no previous period, monthly bars.
 */
export function useEarningsRange() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [range, setRangeState] = useState<EarningsRange>(() => {
    const fallback = getLast30DaysRange();
    return {
      dateFrom: searchParams.get('dateFrom') || fallback.dateFrom,
      dateTo: searchParams.get('dateTo') || fallback.dateTo,
    };
  });

  function setRange(dateFrom: string, dateTo: string) {
    setRangeState({ dateFrom, dateTo });
    const params = new URLSearchParams(searchParams.toString());
    params.set('dateFrom', dateFrom);
    params.set('dateTo', dateTo);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return { range, setRange, openEnded: range.dateFrom === ALL_TIME_START_ISO };
}
