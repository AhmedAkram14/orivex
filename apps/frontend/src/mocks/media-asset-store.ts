/**
 * MSW Demo Clinical Documents fix -- the mock-layer analog of the real
 * backend's `MediaAsset` aggregate (AssetModule), scoped to exactly the
 * fields `MediaAssetListItemResponseDto` / `ListMediaAssetsForOwnerUseCase`
 * already expose (`id`, `purpose`, `contentType`, `createdAt`, `signedUrl`).
 * Not a second document system -- this is the one and only MSW
 * representation of that same real contract, keyed by `ownerAccountId`
 * exactly like the real `MediaAssetRepository.findByOwner()` is.
 *
 * Only ever seeded with `clinical_attachment` / `lab_report` purposes (the
 * two real values in `CLINICAL_MEDIA_ASSET_PURPOSES`) -- the real domain has
 * no `filename` field and no third "consultation report"/"follow-up note"
 * purpose to invent one from, so demo documents are told apart by purpose +
 * content type + date, exactly what a real doctor viewing real documents
 * would also see.
 */
export interface MockMediaAsset {
  id: string;
  ownerAccountId: string;
  purpose: 'clinical_attachment' | 'lab_report';
  contentType: string;
  createdAt: string;
  /** A deterministic local demo path -- never a real S3 URL or random external host, matching this mock layer's no-network-dependency rule for demo mode. No real file is served at this path (no demo document binary was supplied), so this is a realistic value for a real system to attach, not proof of a downloadable asset. */
  signedUrl: string;
}

const assetsByOwnerAccountId = new Map<string, MockMediaAsset[]>();

export function setDocumentsForAccount(accountId: string, assets: MockMediaAsset[]): void {
  assetsByOwnerAccountId.set(accountId, assets);
}

export function getDocumentsForAccount(accountId: string | undefined): MockMediaAsset[] {
  if (!accountId) return [];
  return assetsByOwnerAccountId.get(accountId) ?? [];
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetMediaAssetStore(): void {
  assetsByOwnerAccountId.clear();
}
