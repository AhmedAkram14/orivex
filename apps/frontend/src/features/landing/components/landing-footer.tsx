'use client';

import {
  BadgeCheck,
  Building2,
  HelpCircle,
  LayoutDashboard,
  LayoutGrid,
  LogIn,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LandingLocaleSwitcher } from '@/features/landing/components/landing-locale-switcher';
import { useAuth } from '@/shared/auth/auth-context';
import { Icon } from '@/shared/icons/icon';
import { Text } from '@/design-system/typography';
import { Link } from '@/shared/i18n/navigation';
import { env } from '@/shared/lib/env';
import { Container } from '@/shared/ui/container';
import { Footer } from '@/shared/ui/layout/footer';
import { Logo } from '@/shared/ui/logo';

interface FooterLink {
  href: string;
  icon: LucideIcon;
  label: string;
}

function FooterColumn({ heading, icon, tone, links }: { heading: string; icon: LucideIcon; tone: 'primary' | 'success'; links: FooterLink[] }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="flex items-center gap-2 font-medium text-text-primary">
        <span className={tone === 'primary' ? 'flex size-8 items-center justify-center rounded-full bg-primary-subtle' : 'flex size-8 items-center justify-center rounded-full bg-success-subtle'}>
          <Icon icon={icon} size="sm" className={tone === 'primary' ? 'text-primary' : 'text-success'} />
        </span>
        {heading}
      </span>
      <ul className="flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary">
              <Icon icon={link.icon} size="xs" />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Every link is a real page of the public site (or the app's own sign-in /
 * dashboard), so nothing here is role-walled for any viewer. Signed in, the
 * "Sign In" entry becomes "Go to Dashboard".
 */
export function LandingFooter() {
  const t = useTranslations('landing.footer');
  const tNav = useTranslations('landing.nav');
  const tCommon = useTranslations('common');
  const { status } = useAuth();
  const isAuthenticated = status === 'authenticated';

  const accountLink: FooterLink = isAuthenticated
    ? { href: '/dashboard', icon: LayoutDashboard, label: tNav('goToDashboard') }
    : { href: '/login', icon: LogIn, label: t('patients.signIn') };

  const patientLinks: FooterLink[] = [
    { href: '/doctors', icon: Search, label: t('patients.findDoctor') },
    { href: '/specialties', icon: LayoutGrid, label: t('patients.specialties') },
    { href: '/how-it-works', icon: HelpCircle, label: t('patients.howItWorks') },
    accountLink,
  ];

  const doctorLinks: FooterLink[] = [
    { href: '/for-doctors', icon: Sparkles, label: t('doctors.forDoctors') },
    ...(isAuthenticated ? [] : [{ href: '/register', icon: UserPlus, label: t('doctors.becomeDoctor') }]),
    { href: '/for-doctors#verification', icon: BadgeCheck, label: t('doctors.verification') },
    accountLink,
  ];


  return (
    <Footer className="pt-12 pb-24">
      <Container size="lg" className="flex flex-col gap-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
            <span className="flex items-center gap-2">
              <Logo size="sm" />
              <span className="font-display text-h3 text-text-primary">{tCommon('appName')}</span>
            </span>
            <Text size="sm" tone="tertiary">
              {t('tagline')}
            </Text>
          </div>

          <FooterColumn heading={t('patients.heading')} icon={Users} tone="primary" links={patientLinks} />
          <FooterColumn heading={t('doctors.heading')} icon={Stethoscope} tone="success" links={doctorLinks} />
          {/* About, Help Center, Security & Trust and Contact join this column as their pages ship; until then,
              the one working destination is the support mailbox. */}
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2 font-medium text-text-primary">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary-subtle">
                <Icon icon={Building2} size="sm" className="text-primary" />
              </span>
              {t('company.heading')}
            </span>
            <a href={`mailto:${env.supportEmail}`} className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary">
              <Icon icon={Mail} size="xs" />
              {t('company.contactUs')}
            </a>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border-default pt-6 lg:flex-row">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
            <Text size="sm" tone="tertiary">
              {t('copyright', { year: new Date().getFullYear() })}
            </Text>
          </div>
          <span className="flex items-center gap-2 text-sm text-text-tertiary">
            <Icon icon={ShieldCheck} size="sm" className="text-primary" />
            {t('secureNotice')}
          </span>
          <LandingLocaleSwitcher />
        </div>
      </Container>
    </Footer>
  );
}
