import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { InsuranceProvider } from '../../domain/entities/insurance-provider.entity.js';
import type { InsuranceProviderRepository } from '../../domain/repositories/insurance-provider.repository.js';

import { CreateInsuranceProviderCommand } from './create-insurance-provider/create-insurance-provider.command.js';
import { CreateInsuranceProviderUseCase } from './create-insurance-provider/create-insurance-provider.use-case.js';
import { ListInsuranceProvidersUseCase } from './list-insurance-providers/list-insurance-providers.use-case.js';
import { UpdateInsuranceProviderCommand } from './update-insurance-provider/update-insurance-provider.command.js';
import { UpdateInsuranceProviderUseCase } from './update-insurance-provider/update-insurance-provider.use-case.js';

class FakeInsuranceProviderRepository implements InsuranceProviderRepository {
  private readonly byId = new Map<string, InsuranceProvider>();

  async findAll(): Promise<InsuranceProvider[]> {
    return [...this.byId.values()];
  }
  async findById(id: string): Promise<InsuranceProvider | null> {
    return this.byId.get(id) ?? null;
  }
  async save(provider: InsuranceProvider): Promise<void> {
    this.byId.set(provider.getId(), provider);
  }
}

describe('Reference use cases — InsuranceProvider', () => {
  it('ListInsuranceProvidersUseCase returns everything saved', async () => {
    const repo = new FakeInsuranceProviderRepository();
    await repo.save(InsuranceProvider.create({ name: 'AXA Egypt' }));

    const result = await new ListInsuranceProvidersUseCase(repo).execute();

    assert.equal(result.length, 1);
    assert.equal(result[0].getName(), 'AXA Egypt');
  });

  it('CreateInsuranceProviderUseCase creates and persists a new provider', async () => {
    const repo = new FakeInsuranceProviderRepository();

    const provider = await new CreateInsuranceProviderUseCase(repo).execute(
      new CreateInsuranceProviderCommand({ name: 'MetLife Egypt' }),
    );

    assert.equal(provider.getName(), 'MetLife Egypt');
    assert.equal((await repo.findAll()).length, 1);
  });

  it('UpdateInsuranceProviderUseCase updates an existing provider', async () => {
    const repo = new FakeInsuranceProviderRepository();
    const provider = InsuranceProvider.create({ name: 'MetLife Egypt' });
    await repo.save(provider);

    const updated = await new UpdateInsuranceProviderUseCase(repo).execute(
      new UpdateInsuranceProviderCommand({ insuranceProviderId: provider.getId(), isActive: false }),
    );

    assert.equal(updated.getIsActive(), false);
  });

  it('UpdateInsuranceProviderUseCase throws NotFoundError for an unknown id', async () => {
    const repo = new FakeInsuranceProviderRepository();

    await assert.rejects(
      () =>
        new UpdateInsuranceProviderUseCase(repo).execute(
          new UpdateInsuranceProviderCommand({ insuranceProviderId: '11111111-1111-4111-8111-111111111111' }),
        ),
      NotFoundError,
    );
  });
});
