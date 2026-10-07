'use client';

import { useTranslations } from 'next-intl';
import type { OAuthProvider } from '@/features/auth/api/types';
import { useOAuthSignIn } from '@/features/auth/hooks/use-oauth-sign-in';
import { Button } from '@/shared/ui/button';

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5 shrink-0">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0">
      <path
        fill="#0866FF"
        d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"
      />
    </svg>
  );
}

const PROVIDER_LOGOS: Record<OAuthProvider, () => React.JSX.Element> = {
  google: GoogleLogo,
  facebook: FacebookLogo,
};

/**
 * "Continue with Google / Facebook" (docs/14-adrs.md ADR-008), shown above
 * the email form on sign-in and registration. Plain links, not buttons that
 * fetch: the browser itself walks backend -> provider -> backend ->
 * /oauth-callback. Renders nothing at all when the deployment has no
 * provider configured, so an unconfigured environment shows exactly the
 * page it always did.
 */
export function SocialSignInButtons() {
  const t = useTranslations('auth.social');
  const { providers, startUrl } = useOAuthSignIn();

  if (providers.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {providers.map((provider) => {
          const Logo = PROVIDER_LOGOS[provider];
          return (
            <Button key={provider} asChild variant="secondary">
              <a href={startUrl(provider)}>
                <Logo />
                {t(`continueWith.${provider}`)}
              </a>
            </Button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-xs text-text-secondary" role="separator">
        <span className="h-px flex-1 bg-border-default" />
        {t('divider')}
        <span className="h-px flex-1 bg-border-default" />
      </div>
    </div>
  );
}
