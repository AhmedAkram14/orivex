import type { OAuthProvider } from '../../domain/enums/oauth-provider.enum.js';

export class OAuthProvidersResponseDto {
  providers!: OAuthProvider[];
}
