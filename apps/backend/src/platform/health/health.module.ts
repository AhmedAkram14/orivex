import { Module } from '@nestjs/common';

import { AssetModule } from '../../modules/asset/asset.module.js';

import { HealthController } from './health.controller.js';

@Module({
  imports: [AssetModule],
  controllers: [HealthController],
})
export class HealthModule {}
