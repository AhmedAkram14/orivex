import { Module } from '@nestjs/common';

import { AssetModule } from '../../modules/asset/asset.module.js';
import { NotificationModule } from '../../modules/notification/notification.module.js';

import { HealthController } from './health.controller.js';

@Module({
  imports: [AssetModule, NotificationModule],
  controllers: [HealthController],
})
export class HealthModule {}
