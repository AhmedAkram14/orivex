import { useTranslations } from 'next-intl';
import { Heading, Text } from '@/design-system/typography';
import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/button';
import { Container } from '@/shared/ui/container';

export function CtaSection() {
  const t = useTranslations('landing.cta');

  return (
    <div className="bg-primary">
      <Container size="md" className="flex flex-col items-center gap-5 py-16 text-center">
        <Heading level={1} className="text-primary-foreground">
          {t('title')}
        </Heading>
        <Text size="lg" className="max-w-xl text-primary-foreground/85">
          {t('description')}
        </Text>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="secondary">
            <Link href="/register">{t('primaryCta')}</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
            <Link href="/login">{t('secondaryCta')}</Link>
          </Button>
        </div>
      </Container>
    </div>
  );
}
