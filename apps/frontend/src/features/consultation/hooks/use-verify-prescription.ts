'use client';

import { useQuery } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import { verifyPrescriptionKeys } from '@/features/consultation/hooks/query-keys';

/** I12 -- Prescription digital signature and verification marker: no auth header required -- backs the public verify-prescription page a PDF's QR code links to. */
export function useVerifyPrescription(code: string | undefined) {
  return useQuery({
    queryKey: verifyPrescriptionKeys.detail(code ?? ''),
    queryFn: () => consultationApi.verifyPrescription(code!),
    enabled: Boolean(code),
  });
}
