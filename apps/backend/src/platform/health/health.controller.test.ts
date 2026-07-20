import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import { OBJECT_STORAGE } from '../../modules/asset/application/ports/tokens.js';
import { NOTIFICATION_QUEUE } from '../../modules/notification/application/ports/tokens.js';
import { PrismaService } from '../database/prisma.service.js';

import { HealthController } from './health.controller.js';

class FakePrismaService {
  constructor(private readonly shouldFail: boolean) {}
  async $queryRaw(): Promise<unknown> {
    if (this.shouldFail) {
      throw new Error('connection refused');
    }
    return [{ '?column?': 1 }];
  }
}

class FakeObjectStorage {
  constructor(private readonly shouldFail: boolean) {}
  async checkConnectivity(): Promise<void> {
    if (this.shouldFail) {
      throw new Error('bucket unreachable');
    }
  }
}

class FakeNotificationQueue {
  constructor(private readonly shouldFail: boolean) {}
  async checkConnectivity(): Promise<void> {
    if (this.shouldFail) {
      throw new Error('queue unreachable');
    }
  }
}

interface BuildControllerOptions {
  databaseFails: boolean;
  objectStorageFails: boolean;
  redisUrl?: string;
  queueFails?: boolean;
  sendgridApiKey?: string;
}

async function buildController(options: BuildControllerOptions): Promise<HealthController> {
  const configValues: Record<string, string | undefined> = {
    REDIS_URL: options.redisUrl,
    SENDGRID_API_KEY: options.sendgridApiKey,
  };

  const moduleRef: TestingModule = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [
      { provide: PrismaService, useValue: new FakePrismaService(options.databaseFails) },
      { provide: OBJECT_STORAGE, useValue: new FakeObjectStorage(options.objectStorageFails) },
      { provide: NOTIFICATION_QUEUE, useValue: new FakeNotificationQueue(options.queueFails ?? false) },
      { provide: ConfigService, useValue: { get: (key: string) => configValues[key] } },
    ],
  }).compile();

  return moduleRef.get(HealthController);
}

describe('HealthController', () => {
  it('liveness never touches the database and always reports ok', async () => {
    const controller = await buildController({ databaseFails: true, objectStorageFails: true });

    const result = controller.liveness();

    assert.equal(result.status, 'ok');
    assert.ok(typeof result.uptimeSeconds === 'number');
  });

  it('readiness reports ok when the database and object storage are both reachable', async () => {
    const controller = await buildController({ databaseFails: false, objectStorageFails: false });

    const result = await controller.readiness();

    assert.equal(result.status, 'ok');
    assert.equal(result.checks.database, 'ok');
    assert.equal(result.checks.objectStorage, 'ok');
  });

  it('readiness throws ServiceUnavailableException when the database is unreachable', async () => {
    const controller = await buildController({ databaseFails: true, objectStorageFails: false });

    await assert.rejects(() => controller.readiness(), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal((error as { getStatus?: () => number }).getStatus?.(), 503);
      return true;
    });
  });

  it('readiness throws ServiceUnavailableException when object storage is unreachable', async () => {
    const controller = await buildController({ databaseFails: false, objectStorageFails: true });

    await assert.rejects(() => controller.readiness(), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal((error as { getStatus?: () => number }).getStatus?.(), 503);
      return true;
    });
  });

  it('reports the queue as disabled (never failing readiness) when REDIS_URL is unset', async () => {
    const controller = await buildController({ databaseFails: false, objectStorageFails: false, redisUrl: undefined });

    const result = await controller.readiness();

    assert.equal(result.status, 'ok');
    assert.equal(result.checks.queue, 'disabled');
  });

  it('reports the queue as ok when REDIS_URL is set and the queue is reachable', async () => {
    const controller = await buildController({
      databaseFails: false,
      objectStorageFails: false,
      redisUrl: 'redis://localhost:6379',
      queueFails: false,
    });

    const result = await controller.readiness();

    assert.equal(result.checks.queue, 'ok');
  });

  it('throws ServiceUnavailableException when REDIS_URL is set but the queue is unreachable', async () => {
    const controller = await buildController({
      databaseFails: false,
      objectStorageFails: false,
      redisUrl: 'redis://localhost:6379',
      queueFails: true,
    });

    await assert.rejects(() => controller.readiness(), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal((error as { getStatus?: () => number }).getStatus?.(), 503);
      return true;
    });
  });

  it('reports email as not configured when SENDGRID_API_KEY is unset', async () => {
    const controller = await buildController({ databaseFails: false, objectStorageFails: false, sendgridApiKey: undefined });

    const result = await controller.readiness();

    assert.equal(result.checks.email, 'not configured');
  });

  it('reports email as configured when SENDGRID_API_KEY is set', async () => {
    const controller = await buildController({ databaseFails: false, objectStorageFails: false, sendgridApiKey: 'SG.test' });

    const result = await controller.readiness();

    assert.equal(result.checks.email, 'configured');
  });
});
