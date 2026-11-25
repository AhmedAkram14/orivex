import { ServiceUnavailableException } from '@nestjs/common';

import type { ObjectStoragePort } from '../../application/ports/object-storage.port.js';

const PREVIEW_STORAGE_MESSAGE =
  'Object storage is not configured in preview mode. File uploads and downloads are unavailable.';

export class UnavailableObjectStorageAdapter implements ObjectStoragePort {
  async createPresignedUploadUrl(_storageKey: string, _contentType: string): Promise<string> {
    throw new ServiceUnavailableException(PREVIEW_STORAGE_MESSAGE);
  }

  async createPresignedDownloadUrl(_storageKey: string): Promise<string> {
    throw new ServiceUnavailableException(PREVIEW_STORAGE_MESSAGE);
  }

  async checkConnectivity(): Promise<void> {
    throw new ServiceUnavailableException(PREVIEW_STORAGE_MESSAGE);
  }
}
