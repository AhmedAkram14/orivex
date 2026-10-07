import { createHash } from 'node:crypto';

// RFC 7636 S256: BASE64URL(SHA256(code_verifier)).
export function pkceS256Challenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url');
}
