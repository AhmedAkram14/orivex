// Port only. AssetModule "depends on nothing business-specific, only the
// storage adapter" (docs/10-backend-architecture.md) — this is that
// adapter's contract. Infrastructure implementation is a MinIO/S3-compatible
// client (infrastructure/storage/).
export interface ObjectStoragePort {
  createPresignedUploadUrl(storageKey: string, contentType: string): Promise<string>;
  createPresignedDownloadUrl(storageKey: string): Promise<string>;
}
