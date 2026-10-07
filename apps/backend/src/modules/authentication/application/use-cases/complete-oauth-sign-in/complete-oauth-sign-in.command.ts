import type { Language } from '../../../../identity/domain/enums/language.enum.js';
import type { OAuthProvider } from '../../../domain/enums/oauth-provider.enum.js';

export interface CompleteOAuthSignInCommandProps {
  provider: OAuthProvider;
  code: string;
  codeVerifier: string;
  // Only used when this sign-in creates a brand-new account.
  preferredLanguage?: Language;
  ipAddress?: string;
  userAgent?: string;
}

export class CompleteOAuthSignInCommand {
  readonly provider: OAuthProvider;
  readonly code: string;
  readonly codeVerifier: string;
  readonly preferredLanguage?: Language;
  readonly ipAddress?: string;
  readonly userAgent?: string;

  constructor(props: CompleteOAuthSignInCommandProps) {
    this.provider = props.provider;
    this.code = props.code;
    this.codeVerifier = props.codeVerifier;
    this.preferredLanguage = props.preferredLanguage;
    this.ipAddress = props.ipAddress;
    this.userAgent = props.userAgent;
  }
}
