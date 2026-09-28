'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Heading } from '@/design-system/typography';
import { useUpdatePatientProfile } from '@/features/patient/hooks/use-update-patient-profile';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { TagInput } from '@/shared/ui/tag-input';

/**
 * Asked right before a booking, only while the patient's `allergiesStatus` is
 * still `unknown`. Both answers are saved to the profile, so this never asks
 * again: naming allergies saves `allergies` (the server derives
 * `has_allergies`), and "None known" saves `allergiesStatus: 'none_reported'`.
 * The latter is the patient's own word, separate from the doctor's own
 * "no known allergies" confirmation -- it never counts as one. The patient can
 * change either answer any time in Profile.
 */
export function AllergyPrompt() {
  const t = useTranslations('profileFlow');
  const update = useUpdatePatientProfile();
  const [mode, setMode] = useState<'none' | 'have'>('have');
  const [draft, setDraft] = useState('');

  return (
    <div className="flex flex-col gap-3 rounded-(--r-card) border border-border-default bg-surface-2 p-(--card-pad)">
      <div className="flex flex-col gap-1">
        <Heading as="h3" level={4}>{t('allergyTitle')}</Heading>
        <p className="text-small text-text-secondary">{t('allergyDescription')}</p>
      </div>

      {update.isError && <Alert variant="danger" role="alert">{t('allergySaveError')}</Alert>}

      <SegmentedControl
        ariaLabel={t('allergyTitle')}
        value={mode}
        onChange={(value) => {
          setMode(value);
          if (value === 'none') update.mutate({ allergiesStatus: 'none_reported' });
        }}
        options={[
          { value: 'none', label: t('allergyNone') },
          { value: 'have', label: t('allergyHave') },
        ]}
      />

      {mode === 'have' && (
        <div className="flex flex-col gap-2">
          <TagInput value={draft} onValueChange={setDraft} aria-label={t('allergyLabel')} />
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            disabled={!draft.trim()}
            loading={update.isPending}
            onClick={() => update.mutate({ allergies: draft })}
          >
            {t('allergySave')}
          </Button>
        </div>
      )}
    </div>
  );
}
