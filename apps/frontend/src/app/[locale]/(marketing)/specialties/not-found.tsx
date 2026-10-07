'use client';

import { LayoutGrid, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { Container } from '@/shared/ui/container';
import { EmptyState } from '@/shared/ui/empty-state';

/**
 * An unknown or retired specialty slug, with a way back into the directory.
 * A client component on purpose: a server not-found boundary that reads
 * translations without a locale in scope makes next-intl fall back to request
 * headers, which turned every specialty page in this segment dynamic.
 */
export default function SpecialtyNotFound() {
  const t = useTranslations('publicSite.specialtyPage.notFound');
  return (
    <main id="main-content">
      <Container size="md" className="pt-28 lg:pt-32">
        <h1 className="sr-only">{t('title')}</h1>
        <EmptyState
          size="lg"
          illustration="search-no-results"
          title={t('title')}
          description={t('description')}
          action={
            <Button asChild>
              <Link href="/specialties">
                <Icon icon={LayoutGrid} size="sm" />
                {t('allSpecialties')}
              </Link>
            </Button>
          }
          secondaryAction={
            <Button asChild variant="secondary">
              <Link href="/doctors">
                <Icon icon={Search} size="sm" />
                {t('findDoctor')}
              </Link>
            </Button>
          }
        />
      </Container>
    </main>
  );
}
