import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Test, type TestingModule } from '@nestjs/testing';

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

async function buildController(shouldFail: boolean): Promise<HealthController> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [{ provide: PrismaService, useValue: new FakePrismaService(shouldFail) }],
  }).compile();

  return moduleRef.get(HealthController);
}

describe('HealthController', () => {
  it('liveness never touches the database and always reports ok', async () => {
    const controller = await buildController(true);

    const result = controller.liveness();

    assert.equal(result.status, 'ok');
    assert.ok(typeof result.uptimeSeconds === 'number');
  });

  it('readiness reports ok when the database is reachable', async () => {
    const controller = await buildController(false);

    const result = await controller.readiness();

    assert.equal(result.status, 'ok');
    assert.equal(result.checks.database, 'ok');
  });

  it('readiness throws ServiceUnavailableException when the database is unreachable', async () => {
    const controller = await buildController(true);

    await assert.rejects(() => controller.readiness(), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal((error as { getStatus?: () => number }).getStatus?.(), 503);
      return true;
    });
  });
});
