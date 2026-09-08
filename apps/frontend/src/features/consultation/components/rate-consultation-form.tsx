'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSubmitConsultationFeedback } from '@/features/consultation/hooks/use-submit-consultation-feedback';
import { useUpdateConsultationFeedback } from '@/features/consultation/hooks/use-update-consultation-feedback';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/icons/icon';
import { Textarea } from '@/shared/ui/textarea';
import { cn } from '@/shared/lib/cn';

export interface RateConsultationFormProps {
  consultationSessionId: string;
  doctorProfileId: string;
  onSubmitted?: () => void;
  /** 'edit' reuses this same star-picker UI for correcting an already-submitted review, per the 2026-07-29 product follow-up. */
  mode?: 'create' | 'edit';
  initialRating?: number;
  initialComment?: string;
  initialCommunicationRating?: number;
  initialPunctualityRating?: number;
  initialThoroughnessRating?: number;
  onCancel?: () => void;
}

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

interface StarPickerProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'lg';
}

function StarPicker({ label, value, onChange, size = 'lg' }: StarPickerProps) {
  const t = useTranslations('consultation.rating');
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
      {RATING_VALUES.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={t('starLabel', { count: star })}
          onClick={() => onChange(star)}
          className="p-0.5"
        >
          <Icon
            icon={Star}
            size={size}
            className={cn(star <= value ? 'fill-warning text-warning' : 'text-border-strong')}
          />
        </button>
      ))}
    </div>
  );
}

/**
 * §8/§9/§11 of the consultation-completion follow-up: "Rate your
 * consultation" -- overall 1-5 + optional comment. I4 (docs/01-prd.md
 * L99-100 §2.11) adds three optional dimension pickers (communication,
 * punctuality, thoroughness) alongside the overall rating -- "was the
 * diagnosis right" and "was the doctor kind" are different signals, so
 * they're captured separately rather than inferred from the one overall
 * star count. Each dimension defaults to 0 (not rated) and stays optional;
 * only the overall rating is required to submit.
 */
export function RateConsultationForm({
  consultationSessionId,
  doctorProfileId,
  onSubmitted,
  mode = 'create',
  initialRating = 0,
  initialComment = '',
  initialCommunicationRating = 0,
  initialPunctualityRating = 0,
  initialThoroughnessRating = 0,
  onCancel,
}: RateConsultationFormProps) {
  const t = useTranslations('consultation.rating');
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [communicationRating, setCommunicationRating] = useState(initialCommunicationRating);
  const [punctualityRating, setPunctualityRating] = useState(initialPunctualityRating);
  const [thoroughnessRating, setThoroughnessRating] = useState(initialThoroughnessRating);
  const submitFeedback = useSubmitConsultationFeedback(consultationSessionId, doctorProfileId);
  const updateFeedback = useUpdateConsultationFeedback(consultationSessionId, doctorProfileId);
  const activeMutation = mode === 'edit' ? updateFeedback : submitFeedback;

  async function handleSubmit() {
    if (rating === 0) return;
    await activeMutation.mutateAsync({
      rating,
      comment: comment.trim() || undefined,
      communicationRating: communicationRating || undefined,
      punctualityRating: punctualityRating || undefined,
      thoroughnessRating: thoroughnessRating || undefined,
    });
    onSubmitted?.();
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-text-primary">{t('prompt')}</p>
      <StarPicker label={t('prompt')} value={rating} onChange={setRating} size="lg" />
      <div className="flex flex-col gap-2 border-t border-border-default pt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-text-secondary">{t('communicationLabel')}</span>
          <StarPicker label={t('communicationLabel')} value={communicationRating} onChange={setCommunicationRating} size="sm" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-text-secondary">{t('punctualityLabel')}</span>
          <StarPicker label={t('punctualityLabel')} value={punctualityRating} onChange={setPunctualityRating} size="sm" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-text-secondary">{t('thoroughnessLabel')}</span>
          <StarPicker label={t('thoroughnessLabel')} value={thoroughnessRating} onChange={setThoroughnessRating} size="sm" />
        </div>
      </div>
      <Textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder={t('commentPlaceholder')}
        rows={3}
      />
      {activeMutation.isError && <Alert variant="danger">{t(mode === 'edit' ? 'updateError' : 'submitError')}</Alert>}
      <div className="flex items-center gap-2">
        <Button type="button" loading={activeMutation.isPending} disabled={rating === 0} onClick={handleSubmit}>
          {t(mode === 'edit' ? 'save' : 'submit')}
        </Button>
        {mode === 'edit' && onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={activeMutation.isPending}>
            {t('cancel')}
          </Button>
        )}
      </div>
    </div>
  );
}
