import { FileCheck, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Heading, Text } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
import { Card } from '@/shared/ui/card';
import { Container } from '@/shared/ui/container';

// Every item names a real, working mechanism in this codebase -- doctor
// verification (TrustModule), role-based access control, and the
// upload-intent/confirm MediaAsset pipeline used for both clinical
// documents and verification documents. Nothing here is aspirational.
const ITEMS = [
  { key: 'verifiedDoctors', icon: UserCheck },
  { key: 'identityVerification', icon: FileCheck },
  { key: 'roleBasedAccess', icon: ShieldCheck },
  { key: 'secureUploads', icon: Lock },
] as const;

export function SecurityTrustSection() {
  const t = useTranslations('landing.securityTrust');

  return (
    <Container size="lg" className="flex flex-col gap-8 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <Heading level={1}>{t('title')}</Heading>
        <Text tone="secondary" className="max-w-xl">
          {t('description')}
        </Text>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ key, icon }) => (
          <Card key={key} className="flex flex-col items-center gap-2 p-6 text-center">
            <Icon icon={icon} size="lg" className="text-primary" />
            <Text className="font-medium">{t(`items.${key}.title`)}</Text>
            <Text size="sm" tone="secondary">
              {t(`items.${key}.description`)}
            </Text>
          </Card>
        ))}
      </div>
    </Container>
  );
}
