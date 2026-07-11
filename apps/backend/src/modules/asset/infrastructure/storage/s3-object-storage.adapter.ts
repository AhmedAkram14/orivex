import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';
import type { ObjectStoragePort } from '../../application/ports/object-storage.port.js';

const PRESIGNED_URL_EXPIRY_SECONDS = 15 * 60;

// S3-compatible client (MinIO for local dev, per infrastructure/docker/
// docker-compose.yml; real AWS S3 or equivalent in staging/production —
// same client, only endpoint/credentials differ).
@Injectable()
export class S3ObjectStorageAdapter implements ObjectStoragePort {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(configService: ConfigService<EnvConfig, true>) {
    this.bucket = configService.get('S3_BUCKET', { infer: true });
    this.client = new S3Client({
      endpoint: configService.get('S3_ENDPOINT', { infer: true }),
      region: configService.get('S3_REGION', { infer: true }),
      forcePathStyle: configService.get('S3_FORCE_PATH_STYLE', { infer: true }),
      credentials: {
        accessKeyId: configService.get('S3_ACCESS_KEY_ID', { infer: true }),
        secretAccessKey: configService.get('S3_SECRET_ACCESS_KEY', { infer: true }),
      },
    });
  }

  async createPresignedUploadUrl(storageKey: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS });
  }

  async createPresignedDownloadUrl(storageKey: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: storageKey });
    return getSignedUrl(this.client, command, { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS });
  }
}
