import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { TokenGeneratorPort } from '../../application/ports/token-generator.port.js';

const TOKEN_BYTE_LENGTH = 32;

// Plain tokens (refresh tokens, email-verification/password-reset tokens)
// are 32 bytes of crypto-random data, base64url-encoded. Only the SHA-256
// hash of a token is ever persisted -- tokens are compared by hash only,
// never stored plaintext, same principle as passwords (though SHA-256, not
// argon2: these are already high-entropy random values, not low-entropy
// human passwords, so deliberate hashing slowness would only cost latency
// on every request that validates one, with no security benefit).
@Injectable()
export class NodeTokenGenerator implements TokenGeneratorPort {
  generate(): string {
    return randomBytes(TOKEN_BYTE_LENGTH).toString('base64url');
  }

  hash(plain: string): string {
    return createHash('sha256').update(plain).digest('hex');
  }
}
