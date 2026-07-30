import { Building2, CalendarCheck, HelpCircle, LogIn, Search, ShieldCheck, Stethoscope, UserPlus, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LandingLocaleSwitcher } from '@/features/landing/components/landing-locale-switcher';
import { Icon } from '@/shared/icons/icon';
import { Text } from '@/design-system/typography';
import { Link } from '@/shared/i18n/navigation';
import { Container } from '@/shared/ui/container';
import { Footer } from '@/shared/ui/layout/footer';
import { Logo } from '@/shared/ui/logo';

/**
 * Deliberately omits Privacy Policy / Terms / About Us / Social links --
 * none of those destinations exist anywhere in this codebase yet, and a
 * dead link (or a placeholder page created just to have somewhere to
 * point) is worse than not listing it at all. "Contact Us" is the one
 * exception: it's a real, working `mailto:` the user asked to use here.
 * "How It Works" is a plain same-page anchor (matches `#how-it-works` on
 * `HowItWorksSection`), so -- like the navbar's own section links -- it's a
 * bare `<a>`, not the locale-aware `Link`.
 */
const patientLinks = [
  { href: '/patient/doctors', icon: Search, key: 'findDoctor' as const },
  { href: '/patient/appointments/book', icon: CalendarCheck, key: 'bookAppointment' as const },
  { href: '#how-it-works', icon: HelpCircle, key: 'howItWorks' as const, anchor: true },
  { href: '/login', icon: LogIn, key: 'signIn' as const },
];

const doctorLinks = [
  { href: '/register', icon: UserPlus, key: 'becomeDoctor' as const },
  { href: '#how-it-works', icon: HelpCircle, key: 'howItWorks' as const, anchor: true },
  { href: '/login', icon: LogIn, key: 'signIn' as const },
];

export function LandingFooter() {
  const t = useTranslations('landing.footer');

  return (
    <Footer className="py-12">
      <Container size="lg" className="flex flex-col gap-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
            <Logo size="sm" />
            <Text size="sm" tone="tertiary">
              {t('tagline')}
            </Text>
          </div>

          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2 font-medium text-text-primary">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary-subtle">
                <Icon icon={Users} size="sm" className="text-primary" />
              </span>
              {t('patients.heading')}
            </span>
            {patientLinks.map((link) =>
              link.anchor ? (
                <a key={link.key} href={link.href} className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary">
                  <Icon icon={link.icon} size="xs" />
                  {t(`patients.${link.key}`)}
                </a>
              ) : (
                <Link key={link.key} href={link.href} className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary">
                  <Icon icon={link.icon} size="xs" />
                  {t(`patients.${link.key}`)}
                </Link>
              ),
            )}
          </div>

          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2 font-medium text-text-primary">
              <span className="flex size-8 items-center justify-center rounded-full bg-success-subtle">
                <Icon icon={Stethoscope} size="sm" className="text-success" />
              </span>
              {t('doctors.heading')}
            </span>
            {doctorLinks.map((link) =>
              link.anchor ? (
                <a key={link.key} href={link.href} className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary">
                  <Icon icon={link.icon} size="xs" />
                  {t(`doctors.${link.key}`)}
                </a>
              ) : (
                <Link key={link.key} href={link.href} className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary">
                  <Icon icon={link.icon} size="xs" />
                  {t(`doctors.${link.key}`)}
                </Link>
              ),
            )}
          </div>

          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2 font-medium text-text-primary">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary-subtle">
                <Icon icon={Building2} size="sm" className="text-primary" />
              </span>
              {t('company.heading')}
            </span>
            <a
              href="mailto:ahmed.akram7474@gmail.com"
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary"
            >
              {t('company.contactUs')}
            </a>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border-default pt-6 sm:flex-row">
          <Text size="sm" tone="tertiary">
            {t('copyright', { year: new Date().getFullYear() })}
          </Text>
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
