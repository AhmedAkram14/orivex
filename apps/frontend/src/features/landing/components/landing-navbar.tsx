'use client';

import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { LandingUserMenu } from '@/features/landing/components/landing-user-menu';
import { useAuth } from '@/shared/auth/auth-context';
import { Link, usePathname } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Container } from '@/shared/ui/container';
import { Drawer } from '@/shared/ui/side-panel';
import { Logo } from '@/shared/ui/logo';

export const PUBLIC_NAV_LINKS = [
  { href: '/specialties', key: 'specialties' },
  { href: '/doctors', key: 'findDoctor' },
  { href: '/how-it-works', key: 'howItWorks' },
  { href: '/for-doctors', key: 'forDoctors' },
  // '/help' (key: 'help') joins this list when the Help Center page ships -- never a link to a page that doesn't exist yet.
] as const;

/** A link is active on its own route and on every route nested under it (`/specialties/cardiology` keeps "Specialties" lit). */
export function isNavLinkActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The public site's header -- distinct from `AppShell`'s Topbar
 * (authenticated-only, session-aware). Every link is a real, locale-aware
 * route of the public marketing site; the current one is highlighted and
 * carries `aria-current="page"`. Below `lg` the links move into a drawer:
 * five links plus the account buttons don't fit the pill at tablet width.
 */
export function LandingNavbar() {
  const t = useTranslations('landing.nav');
  const tCommon = useTranslations('common');
  const { status, user } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-4 z-(--z-dropdown)">
      <Container size="lg">
        <div className="flex h-16 items-center justify-between gap-4 rounded-full border border-border-default bg-surface px-4 shadow-sm sm:px-6">
          <Link href="/" aria-label={t('homeLabel')} className="flex items-center gap-2 text-lg font-semibold text-text-primary">
            <Logo size="sm" />
            {tCommon('appName')}
          </Link>

          <nav aria-label={t('primaryLabel')} className="hidden items-center gap-6 lg:flex">
            {PUBLIC_NAV_LINKS.map((link) => {
              const active = isNavLinkActive(pathname, link.href);
              return (
                <Link
                  key={link.key}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-full px-1 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
                    active ? 'font-semibold text-primary' : 'text-text-secondary hover:text-primary',
                  )}
                >
                  {t(link.key)}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-3 md:flex">
              {status === 'authenticated' && user ? (
                <LandingUserMenu user={user} />
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="rounded-full">
                    <Link href="/login">{t('signIn')}</Link>
                  </Button>
                  <Button asChild size="sm" className="rounded-full">
                    <Link href="/register">{t('register')}</Link>
                  </Button>
                </>
              )}
            </div>

            <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
              <Drawer.Trigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full lg:hidden" aria-label={t('openMenu')}>
                  <Icon icon={Menu} size="md" />
                </Button>
              </Drawer.Trigger>
              <Drawer.Content side="start" className="flex flex-col gap-6">
                <Drawer.Title className="flex items-center gap-2 text-lg font-semibold text-text-primary">
                  <Logo size="sm" />
                  {tCommon('appName')}
                </Drawer.Title>
                <nav aria-label={t('primaryLabel')} className="flex flex-col gap-1">
                  {PUBLIC_NAV_LINKS.map((link) => {
                    const active = isNavLinkActive(pathname, link.href);
                    return (
                      <Link
                        key={link.key}
                        href={link.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'rounded-md px-3 py-2.5 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
                          active ? 'bg-primary-subtle font-semibold text-primary-emphasis' : 'text-text-secondary hover:text-primary',
                        )}
                      >
                        {t(link.key)}
                      </Link>
                    );
                  })}
                </nav>
                <div className="mt-auto flex flex-col gap-2">
                  {status === 'authenticated' && user ? (
                    <LandingUserMenu user={user} />
                  ) : (
                    <>
                      <Button asChild variant="secondary" className="rounded-full">
                        <Link href="/login">{t('signIn')}</Link>
                      </Button>
                      <Button asChild className="rounded-full">
                        <Link href="/register">{t('register')}</Link>
                      </Button>
                    </>
                  )}
                </div>
              </Drawer.Content>
            </Drawer>
          </div>
        </div>
      </Container>
    </header>
  );
}
