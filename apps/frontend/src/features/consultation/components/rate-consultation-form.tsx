'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSubmitConsultationFeedback } from '@/features/consultation/hooks/use-submit-consultation-feedback';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/icons/icon';
import { Textarea } from '@/shared/ui/textarea';
import { cn } from '@/shared/lib/cn';

export interface RateConsultationFormProps {
  consultationSessionId: string;
  doctorProfileId: string;
  onSubmitted?: () => void;
}

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

/** §8/§9/§11 of the consultation-completion follow-up: "Rate your consultation" -- overall 1-5 + optional comment, sufficient for V1 per the approved scope. */
export function RateConsultationForm({ consultationSessionId, doctorProfileId, onSubmitted }: RateConsultationFormProps) {
  const t = useTranslations('consultation.rating');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const submitFeedback = useSubmitConsultationFeedback(consultationSessionId, doctorProfileId);

  async function handleSubmit() {
    if (rating === 0) return;
    await submitFeedback.mutateAsync({ rating, comment: comment.trim() || undefined });
    onSubmitted?.();
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-text-primary">{t('prompt')}</p>
      <div className="flex items-center gap-1" role="radiogroup" aria-label={t('prompt')}>
        {RATING_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={t('starLabel', { count: value })}
            onClick={() => setRating(value)}
            className="p-0.5"
          >
            <Icon
              icon={Star}
              size="lg"
              className={cn(value <= rating ? 'fill-warning text-warning' : 'text-border-strong')}
            />
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder={t('commentPlaceholder')}
        rows={3}
      />
      {submitFeedback.isError && <Alert variant="danger">{t('submitError')}</Alert>}
      <Button type="button" loading={submitFeedback.isPending} disabled={rating === 0} onClick={handleSubmit}>
        {t('submit')}
      </Button>
    </div>
  );
}
