import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';
import type { AccessTokenClaims, JwtSignerPort, SignedAccessToken } from '../../application/ports/jwt-signer.port.js';
import { TokenInvalidError } from '../../domain/exceptions/token-invalid.error.js';

interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class NestjsJwtSigner implements JwtSignerPort {
  private readonly ttlSeconds: number;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService<EnvConfig, true>,
  ) {
    this.ttlSeconds = configService.get('JWT_ACCESS_TTL_SECONDS', { infer: true });
  }

  async sign(claims: AccessTokenClaims): Promise<SignedAccessToken> {
    // Claims are deliberately minimal: account id + role only, never email
    // or PHI (docs/11-api-contracts.md's explicit JWT design rule).
    const payload: JwtPayload = { sub: claims.accountId, role: claims.role };
    const token = await this.jwtService.signAsync(payload, { expiresIn: this.ttlSeconds });
    return { token, expiresAt: new Date(Date.now() + this.ttlSeconds * 1000) };
  }

  async verify(token: string): Promise<AccessTokenClaims> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      return { accountId: payload.sub, role: payload.role };
    } catch {
      throw new TokenInvalidError();
    }
  }
}
