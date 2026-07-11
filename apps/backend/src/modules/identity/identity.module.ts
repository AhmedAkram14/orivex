import { Module } from '@nestjs/common';

// Domain-only for Sprint 1.1A: no providers or controllers yet (no
// repository implementation, use cases, or HTTP surface). Deliberately not
// registered in AppModule until the module has something to provide
// (per architect decision) — application/infrastructure/presentation layers
// land in a later sprint.
@Module({})
export class IdentityModule {}
