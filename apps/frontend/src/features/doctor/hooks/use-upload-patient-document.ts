'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorPatientChartDocumentsKeys } from '@/features/doctor/hooks/query-keys';
import { putFileToSignedUrl } from '@/shared/media/hooks/use-upload-media-asset';
import type { MediaAsset } from '@/shared/media/types';
import type { DoctorPatientDocumentPurpose } from '@/features/doctor/api/types';

/**
 * Doctor Patient Chart Phase 4.2: the same upload-intent -> PUT -> confirm
 * flow `useUploadMediaAsset` uses for a caller's own uploads (reusing its
 * exact `putFileToSignedUrl` step), wired instead to the doctor-only
 * `/doctor/patients/:id/documents/*` routes so the resulting MediaAsset is
 * owned by the PATIENT's account, never the doctor's own. On success,
 * invalidates that patient's documents query.
 */
export function useUploadPatientDocument(patientProfileId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, purpose }: { file: File; purpose: DoctorPatientDocumentPurpose }): Promise<MediaAsset> => {
      const intent = await doctorApi.createPatientDocumentUploadIntent(patientProfileId, {
        contentType: file.type,
        purpose,
        sizeEstimate: file.size,
      });
      if (!intent.signedUrl) {
        throw new Error('No signed upload URL was returned.');
      }
      await putFileToSignedUrl(intent.signedUrl, file);
      return doctorApi.confirmPatientDocumentUpload(patientProfileId, intent.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: doctorPatientChartDocumentsKeys.detail(patientProfileId) });
    },
  });
}
