import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { DeviceSessionsList } from '@/features/auth/components/device-sessions-list';
import { LoginHistoryTable } from '@/features/auth/components/login-history-table';
import { LogoutAllDevicesButton } from '@/features/auth/components/logout-all-devices-button';
import { Heading } from '@/design-system/typography';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/ui/card';
import { Container } from '@/shared/ui/container';
import { buildPageMetadata } from '@/shared/lib/seo';
import type { AppLocale } from '@/shared/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.securityCenter' });
  return buildPageMetadata({ locale: locale as AppLocale, path: '/security', title: t('title'), description: t('subtitle') });
}

export default async function SecurityCenterPage() {
  const t = await getTranslations('auth.securityCenter');

  return (
    <Container className="flex flex-col gap-6 py-8">
      <div className="flex flex-col gap-1">
        <Heading as="h1" level={2}>{t('title')}</Heading>
        <p className="text-text-secondary">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('deviceSessions.title')}</CardTitle>
          <CardDescription>{t('deviceSessions.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <DeviceSessionsList />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('loginHistory.title')}</CardTitle>
          <CardDescription>{t('loginHistory.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginHistoryTable />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('logoutAll.title')}</CardTitle>
          <CardDescription>{t('logoutAll.description')}</CardDescription>
        </CardHeader>
        <CardFooter>
          <LogoutAllDevicesButton />
        </CardFooter>
      </Card>
    </Container>
  );
}
