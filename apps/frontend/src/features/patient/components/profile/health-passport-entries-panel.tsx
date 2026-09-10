'use client';

import { Plus, Syringe, Trash2, Users, Pill, Scissors } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import type { HealthPassportEntryCategory } from '@/features/patient/api/types';
import { useDeleteHealthPassportEntry } from '@/features/patient/hooks/use-delete-health-passport-entry';
import { useHealthPassportEntries } from '@/features/patient/hooks/use-health-passport-entries';
import { useRecordHealthPassportEntry } from '@/features/patient/hooks/use-record-health-passport-entry';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Icon } from '@/shared/icons/icon';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';

const CATEGORIES: HealthPassportEntryCategory[] = ['vaccination', 'family_history', 'surgery', 'medication'];
const CATEGORY_ICON = { vaccination: Syringe, family_history: Users, surgery: Scissors, medication: Pill } as const;

/**
 * I6 -- Health Passport (docs/01-prd.md L59 §2.4, docs/01.1-prd-update.md
 * §17-30): patient-editable vaccinations/family history/surgeries/current
 * medications. One flat add form + one categorized list, matching
 * RecordHealthPassportEntryRequestDto's real shape exactly (title + optional
 * detail/date) -- no per-category form variants, since the backend doesn't
 * model per-category fields either.
 */
export function HealthPassportEntriesPanel() {
  const t = useTranslations('patient.profile.healthPassportEntries');
  const format = useFormatter();
  const { data: entries, isLoading, isError } = useHealthPassportEntries();
  const recordEntry = useRecordHealthPassportEntry();
  const deleteEntry = useDeleteHealthPassportEntry();

  const [category, setCategory] = useState<HealthPassportEntryCategory>('vaccination');
  const [title, setTitle] = useState('');
  const [occurredAt, setOccurredAt] = useState('');

  async function handleAdd() {
    if (!title.trim()) return;
    await recordEntry.mutateAsync({
      category,
      title: title.trim(),
      occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
    });
    setTitle('');
    setOccurredAt('');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        <div className="flex flex-col gap-2 rounded-lg border border-border-default p-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="passport-entry-category" className="text-xs font-medium text-text-primary">
              {t('categoryLabel')}
            </label>
            <Select value={category} onValueChange={(value) => setCategory(value as HealthPassportEntryCategory)}>
              <SelectTrigger id="passport-entry-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`category.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="passport-entry-title" className="text-xs font-medium text-text-primary">
              {t('titleLabel')}
            </label>
            <Input id="passport-entry-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('titlePlaceholder')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="passport-entry-date" className="text-xs font-medium text-text-primary">
              {t('dateLabel')}
            </label>
            <Input id="passport-entry-date" type="date" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} />
          </div>
          <Button type="button" size="sm" loading={recordEntry.isPending} disabled={!title.trim()} onClick={handleAdd}>
            <Icon icon={Plus} size="sm" className="me-2" />
            {t('add')}
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !entries || entries.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 rounded-lg border border-border-default p-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary-emphasis">
                  <Icon icon={CATEGORY_ICON[entry.category]} size="sm" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-sm font-medium text-text-primary">{entry.title}</p>
                  <p className="text-xs text-text-tertiary">
                    {t(`category.${entry.category}`)}
                    {entry.occurredAt && ` · ${format.dateTime(new Date(entry.occurredAt), { year: 'numeric', month: 'short', day: 'numeric' })}`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('remove')}
                  loading={deleteEntry.isPending}
                  onClick={() => deleteEntry.mutate(entry.id)}
                >
                  <Icon icon={Trash2} size="sm" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
