import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { DeviceSessionsList } from '@/features/auth/components/device-sessions-list';
import { LoginHistoryTable } from '@/features/auth/components/login-history-table';
import { LogoutAllDevicesButton } from '@/features/auth/components/logout-all-devices-button';
import { SignOutOtherDevicesButton } from '@/features/auth/components/sign-out-other-devices-button';
import { SecuritySummaryStrip } from '@/features/auth/components/security-summary-strip';
import { PasswordSection } from '@/features/auth/components/password-section';
import { TwoFactorSection } from '@/features/auth/components/two-factor-section';
import { LoginAlertsSection } from '@/features/auth/components/login-alerts-section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/ui/card';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';
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
    <Page>
      <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('subtitle')} />

      <SecuritySummaryStrip />

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
        <CardFooter className="flex flex-wrap gap-3">
          <SignOutOtherDevicesButton />
          <LogoutAllDevicesButton />
        </CardFooter>
      </Card>

      <Card id="password">
        <CardHeader>
          <CardTitle>{t('password.title')}</CardTitle>
          <CardDescription>{t('password.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordSection />
        </CardContent>
      </Card>

      <Card id="two-factor">
        <CardHeader>
          <CardTitle>{t('twoFactor.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <TwoFactorSection />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('loginAlerts.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginAlertsSection />
        </CardContent>
      </Card>
    </Page>
  );
}
