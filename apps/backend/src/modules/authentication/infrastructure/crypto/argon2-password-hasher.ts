import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';
import type { PasswordHasherPort } from '../../application/ports/password-hasher.port.js';

// argon2id (OWASP's current recommendation for new systems): resists both
// GPU-cracking (via memory cost) and side-channel attacks (id variant),
// unlike argon2i/argon2d individually. Cost params are env-configurable
// (docs/14-adrs.md's "First-Party Authentication" ADR) rather than
// hardcoded, so production can tune for its actual hardware.
@Injectable()
export class Argon2PasswordHasher implements PasswordHasherPort {
  private readonly memoryCostKib: number;
  private readonly timeCost: number;
  private readonly parallelism: number;

  constructor(configService: ConfigService<EnvConfig, true>) {
    this.memoryCostKib = configService.get('ARGON2_MEMORY_COST_KIB', { infer: true });
    this.timeCost = configService.get('ARGON2_TIME_COST', { infer: true });
    this.parallelism = configService.get('ARGON2_PARALLELISM', { infer: true });
  }

  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: this.memoryCostKib,
      timeCost: this.timeCost,
      parallelism: this.parallelism,
    });
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
