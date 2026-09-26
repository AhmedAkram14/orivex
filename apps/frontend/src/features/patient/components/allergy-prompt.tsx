'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Heading } from '@/design-system/typography';
import { useUpdatePatientProfile } from '@/features/patient/hooks/use-update-patient-profile';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { TagInput } from '@/shared/ui/tag-input';

export interface AllergyPromptProps {
  /** Whether the patient chose "None known" for this booking. Not persisted: the backend only stores allergies a patient names, and a doctor's own "no known allergies" confirmation. */
  noneChosen: boolean;
  onChooseNone: () => void;
}

/**
 * Asked right before a booking, only while no allergies are on record: name
 * them (saved to the profile, so this never asks again) or say "None known".
 * "None known" clears the booking gate but is deliberately NOT written as text
 * into `allergies` -- the doctor's chart reads any non-empty value there as a
 * present allergy.
 */
export function AllergyPrompt({ noneChosen, onChooseNone }: AllergyPromptProps) {
  const t = useTranslations('profileFlow');
  const update = useUpdatePatientProfile();
  const [mode, setMode] = useState<'none' | 'have'>(noneChosen ? 'none' : 'have');
  const [draft, setDraft] = useState('');

  return (
    <div className="flex flex-col gap-3 rounded-(--r-card) border border-border-default bg-surface-2 p-(--card-pad)">
      <div className="flex flex-col gap-1">
        <Heading as="h3" level={4}>{t('allergyTitle')}</Heading>
        <p className="text-small text-text-secondary">{t('allergyDescription')}</p>
      </div>

      <SegmentedControl
        ariaLabel={t('allergyTitle')}
        value={mode}
        onChange={(value) => {
          setMode(value);
          if (value === 'none') onChooseNone();
        }}
        options={[
          { value: 'none', label: t('allergyNone') },
          { value: 'have', label: t('allergyHave') },
        ]}
      />

      {mode === 'none' && <p className="text-small text-text-secondary">{t('allergyNoneNote')}</p>}

      {mode === 'have' && (
        <div className="flex flex-col gap-2">
          {update.isError && <Alert variant="danger" role="alert">{t('allergySaveError')}</Alert>}
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
