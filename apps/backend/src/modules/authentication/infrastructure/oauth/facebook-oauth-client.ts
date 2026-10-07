import { createHmac } from 'node:crypto';

import type { OAuthProfile, OAuthProviderClientPort } from '../../application/ports/oauth-provider.port.js';
import { OAuthProvider } from '../../domain/enums/oauth-provider.enum.js';
import { OAuthSignInFailedError, OAuthSignInFailureReason } from '../../domain/exceptions/oauth-sign-in-failed.error.js';

export interface FacebookOAuthClientConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  graphApiVersion: string;
}

// Facebook Login, manual (server-side) flow: authorization code exchanged
// server-to-server with the app secret, then the profile read from the
// Graph API with an appsecret_proof (so a leaked user access token alone
// can't be replayed against this app). Facebook's manual flow documents no
// PKCE parameters, so the code verifier is unused here -- the app secret
// (confidential client) and the controller's state check are the binding.
//
// Facebook makes no "email verified" assertion -- it only says the field is
// omitted when no valid address exists -- so, like django-allauth's own
// default, emailVerified is always false here. That keeps Facebook from
// ever auto-linking to an existing ORIVEX account, and a new Facebook
// signup confirms its email the same way /auth/register does
// (docs/14-adrs.md ADR-008).
export class FacebookOAuthClient implements OAuthProviderClientPort {
  readonly provider = OAuthProvider.Facebook;

  constructor(private readonly config: FacebookOAuthClientConfig) {}

  buildAuthorizationUrl(input: { state: string }): string {
    const url = new URL(`https://www.facebook.com/${this.config.graphApiVersion}/dialog/oauth`);
    url.search = new URLSearchParams({
      client_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'email,public_profile',
      state: input.state,
    }).toString();
    return url.toString();
  }

  async exchangeCode(input: { code: string }): Promise<OAuthProfile> {
    const graph = `https://graph.facebook.com/${this.config.graphApiVersion}`;

    const tokenUrl = new URL(`${graph}/oauth/access_token`);
    tokenUrl.search = new URLSearchParams({
      client_id: this.config.appId,
      client_secret: this.config.appSecret,
      redirect_uri: this.config.redirectUri,
      code: input.code,
    }).toString();
    const tokenResponse = await fetch(tokenUrl);
    if (!tokenResponse.ok) {
      throw new OAuthSignInFailedError(OAuthSignInFailureReason.ProviderRejected);
    }
    const { access_token: accessToken } = (await tokenResponse.json()) as { access_token?: unknown };
    if (typeof accessToken !== 'string') {
      throw new OAuthSignInFailedError(OAuthSignInFailureReason.ProviderRejected);
    }

    const meUrl = new URL(`${graph}/me`);
    meUrl.search = new URLSearchParams({
      fields: 'id,name,email',
      access_token: accessToken,
      appsecret_proof: createHmac('sha256', this.config.appSecret).update(accessToken).digest('hex'),
    }).toString();
    const meResponse = await fetch(meUrl);
    if (!meResponse.ok) {
      throw new OAuthSignInFailedError(OAuthSignInFailureReason.ProviderRejected);
    }
    const me = (await meResponse.json()) as { id?: unknown; name?: unknown; email?: unknown };
    if (typeof me.id !== 'string' || me.id.length === 0) {
      throw new OAuthSignInFailedError(OAuthSignInFailureReason.ProviderRejected);
    }

    return {
      provider: this.provider,
      subject: me.id,
      email: typeof me.email === 'string' ? me.email : undefined,
      emailVerified: false,
      displayName: typeof me.name === 'string' ? me.name : undefined,
    };
  }
}
