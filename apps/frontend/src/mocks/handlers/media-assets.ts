import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import type { MediaAsset, MediaAssetPurpose } from '@/shared/media/types';

const base = () => env.apiBaseUrl;

/**
 * `POST /media-assets/upload-intent` and `POST /media-assets/:id/confirm`
 * are real endpoints (AssetModule's MediaAssetController) -- this handler
 * exists purely to keep the frontend test suite deterministic. The signed
 * "upload" URL points back at this same mock origin (a PUT handler below
 * accepts it unconditionally) rather than a real S3-compatible endpoint,
 * since no object storage exists in the test environment.
 */
export const mediaAssetHandlers = [
  http.post(`${base()}/media-assets/upload-intent`, async ({ request }) => {
    const body = (await request.json()) as { contentType: string; purpose: MediaAssetPurpose };
    const id = `asset-${Date.now()}`;
    const asset: MediaAsset = {
      id,
      purpose: body.purpose,
      contentType: body.contentType,
      status: 'pending',
      signedUrl: `${base()}/mock-object-storage/${id}`,
    };
    return HttpResponse.json({ data: asset }, { status: 201 });
  }),

  http.put(`${base()}/mock-object-storage/:id`, () => new HttpResponse(null, { status: 200 })),

  http.post(`${base()}/media-assets/:id/confirm`, ({ params }) => {
    const asset: MediaAsset = {
      id: params.id as string,
      purpose: 'doctor_certificate',
      contentType: 'application/pdf',
      status: 'confirmed',
      signedUrl: `${base()}/mock-object-storage/${params.id}`,
    };
    return HttpResponse.json({ data: asset });
  }),
];
