import type { OAuthProvider } from '../../../domain/enums/oauth-provider.enum.js';

export interface BeginOAuthSignInCommandProps {
  provider: OAuthProvider;
}

export class BeginOAuthSignInCommand {
  readonly provider: OAuthProvider;

  constructor(props: BeginOAuthSignInCommandProps) {
    this.provider = props.provider;
  }
}
