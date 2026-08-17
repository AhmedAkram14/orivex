import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import type { MediaAsset, MediaAssetPurpose } from '@/shared/media/types';
import { identityVerificationRequiredResponse, isPatientVerified } from '@/mocks/identity-verification-gate';
import { resolveRequestAccountId } from '@/mocks/request-account';

const base = () => env.apiBaseUrl;

// Onboarding Redesign (2026-07-21 proposal, Stage O.4/O.7): matches
// AssetModule's real MediaAssetController -- a Patient uploading a clinical
// document (never an identity-verification document itself) is gated
// unless already Approved.
const CLINICAL_PURPOSES: readonly MediaAssetPurpose[] = ['clinical_attachment', 'lab_report'];

// Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): tracks
// the purpose/contentType each id was declared with at upload-intent time, so
// `confirm` and the new admin-only `GET /media-assets/:id` (below) can report
// the asset's real shape back instead of a fixed, invented one.
const declaredAssetsById: Record<string, { purpose: MediaAssetPurpose; contentType: string }> = {};

// Seeded so the admin verification case-detail document viewer can resolve
// `patient-store.ts`'s own seeded `seedVerifications()` documentAssetIds --
// those ids never went through the upload-intent/confirm pair below since
// they represent a submission that happened before this mock session
// started, matching the same "pre-existing seed data" precedent used
// elsewhere in this mock layer (e.g. `doctor-store.ts`'s seeded profile).
function seedConfirmedAssets(): Record<string, MediaAsset> {
  const signedUrl = (id: string) => `${base()}/mock-object-storage/${id}`;
  return {
    'seed-national-id-front': { id: 'seed-national-id-front', purpose: 'national_id_front', contentType: 'image/jpeg', status: 'confirmed', signedUrl: signedUrl('seed-national-id-front') },
    'seed-national-id-back': { id: 'seed-national-id-back', purpose: 'national_id_back', contentType: 'image/jpeg', status: 'confirmed', signedUrl: signedUrl('seed-national-id-back') },
    'seed-selfie-with-id': { id: 'seed-selfie-with-id', purpose: 'selfie_with_id', contentType: 'image/jpeg', status: 'confirmed', signedUrl: signedUrl('seed-selfie-with-id') },
  };
}

const confirmedAssetsById: Record<string, MediaAsset> = seedConfirmedAssets();

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

    if (CLINICAL_PURPOSES.includes(body.purpose) && !isPatientVerified(resolveRequestAccountId(request))) {
      return identityVerificationRequiredResponse();
    }

    const id = `asset-${Date.now()}`;
    declaredAssetsById[id] = { purpose: body.purpose, contentType: body.contentType };
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
    const id = params.id as string;
    const declared = declaredAssetsById[id];
    const asset: MediaAsset = {
      id,
      purpose: declared?.purpose ?? 'doctor_certificate',
      contentType: declared?.contentType ?? 'application/pdf',
      status: 'confirmed',
      signedUrl: `${base()}/mock-object-storage/${id}`,
    };
    confirmedAssetsById[id] = asset;
    return HttpResponse.json({ data: asset });
  }),

  // Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): the
  // real, owner-or-admin-only route (AssetModule's MediaAssetController) --
  // backs the verification case-detail page's document viewer. Any
  // previously-submitted National ID/license/certificate id used in a
  // verification wizard flow (patient-store.ts/doctor-store.ts's own seed
  // document ids) resolves here too, since verification documents are
  // confirmed through this same upload-intent/confirm pair before their id
  // is attached to a VerificationCase.
  http.get(`${base()}/media-assets/:id`, ({ params }) => {
    const id = params.id as string;
    const asset = confirmedAssetsById[id];
    if (!asset) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Media asset not found.', requestId: 'mock', timestamp: new Date().toISOString() } },
        { status: 404 },
      );
    }
    return HttpResponse.json({ data: asset });
  }),
];
