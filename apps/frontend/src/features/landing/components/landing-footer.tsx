import { useTranslations } from 'next-intl';
import { Text } from '@/design-system/typography';
import { Link } from '@/shared/i18n/navigation';
import { Container } from '@/shared/ui/container';
import { Footer } from '@/shared/ui/layout/footer';
import { Logo } from '@/shared/ui/logo';

/**
 * Deliberately omits Privacy Policy / Terms / Contact / Social links --
 * none of those destinations exist anywhere in this codebase yet, and a
 * dead link (or a placeholder page created just to have somewhere to
 * point) is worse than not listing the section at all. Every link below
 * resolves to a real, already-working route.
 */
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
          <div className="flex flex-col gap-2">
            <Text size="sm" className="font-medium">
              {t('patients.heading')}
            </Text>
            <Link href="/patient/doctors" className="text-sm text-text-secondary hover:text-primary">
              {t('patients.findDoctor')}
            </Link>
            <Link href="/patient/appointments/book" className="text-sm text-text-secondary hover:text-primary">
              {t('patients.bookAppointment')}
            </Link>
            <Link href="/login" className="text-sm text-text-secondary hover:text-primary">
              {t('patients.signIn')}
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <Text size="sm" className="font-medium">
              {t('doctors.heading')}
            </Text>
            <Link href="/register" className="text-sm text-text-secondary hover:text-primary">
              {t('doctors.becomeDoctor')}
            </Link>
            <Link href="/login" className="text-sm text-text-secondary hover:text-primary">
              {t('doctors.signIn')}
            </Link>
          </div>
        </div>
        <Text size="sm" tone="tertiary">
          {t('copyright', { year: new Date().getFullYear() })}
        </Text>
      </Container>
    </Footer>
  );
}
