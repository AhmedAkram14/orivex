'use client';

import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { Container } from '@/shared/ui/container';
import { Drawer } from '@/shared/ui/side-panel';
import { Logo } from '@/shared/ui/logo';

const SECTION_LINKS = [
  { href: '#specialties', key: 'specialties' },
  { href: '#how-it-works', key: 'howItWorks' },
  { href: '#for-doctors', key: 'forDoctors' },
  { href: '#faq', key: 'faq' },
] as const;

/**
 * The landing page's own header -- distinct from `AppShell`'s Topbar
 * (authenticated-only, session-aware). Section links are plain in-page
 * anchors (`#specialties`, etc. -- matching the `id`s each section already
 * sets), not routes; Sign in/Register are the only real navigations, so
 * only those go through the locale-aware `Link`.
 */
export function LandingNavbar() {
  const t = useTranslations('landing.nav');
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-4 z-(--z-dropdown)">
      <Container size="lg">
        <div className="flex h-16 items-center justify-between gap-4 rounded-full border border-border-default bg-surface px-4 shadow-sm sm:px-6">
          <a href="#top" className="flex items-center gap-2 text-lg font-semibold text-text-primary">
            <Logo size="sm" />
          </a>

          <nav aria-label={t('sectionsLabel')} className="hidden items-center gap-6 md:flex">
            {SECTION_LINKS.map((link) => (
              <a key={link.key} href={link.href} className="text-sm text-text-secondary hover:text-primary">
                {t(link.key)}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link href="/login">{t('signIn')}</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full">
              <Link href="/register">{t('register')}</Link>
            </Button>
          </div>

          <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
            <Drawer.Trigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full md:hidden" aria-label={t('openMenu')}>
                <Icon icon={Menu} size="md" />
              </Button>
            </Drawer.Trigger>
            <Drawer.Content side="start" className="flex flex-col gap-6">
              <Drawer.Title className="flex items-center gap-2 text-lg font-semibold text-text-primary">
                <Logo size="sm" />
              </Drawer.Title>
              <nav aria-label={t('sectionsLabel')} className="flex flex-col gap-4">
                {SECTION_LINKS.map((link) => (
                  <a
                    key={link.key}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-base text-text-secondary hover:text-primary"
                  >
                    {t(link.key)}
                  </a>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2">
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/login">{t('signIn')}</Link>
                </Button>
                <Button asChild className="rounded-full">
                  <Link href="/register">{t('register')}</Link>
                </Button>
              </div>
            </Drawer.Content>
          </Drawer>
        </div>
      </Container>
    </header>
  );
}
