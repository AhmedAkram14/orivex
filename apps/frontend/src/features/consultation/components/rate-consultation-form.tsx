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
  onCancel?: () => void;
}

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

/** §8/§9/§11 of the consultation-completion follow-up: "Rate your consultation" -- overall 1-5 + optional comment, sufficient for V1 per the approved scope. */
export function RateConsultationForm({
  consultationSessionId,
  doctorProfileId,
  onSubmitted,
  mode = 'create',
  initialRating = 0,
  initialComment = '',
  onCancel,
}: RateConsultationFormProps) {
  const t = useTranslations('consultation.rating');
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const submitFeedback = useSubmitConsultationFeedback(consultationSessionId, doctorProfileId);
  const updateFeedback = useUpdateConsultationFeedback(consultationSessionId, doctorProfileId);
  const activeMutation = mode === 'edit' ? updateFeedback : submitFeedback;

  async function handleSubmit() {
    if (rating === 0) return;
    await activeMutation.mutateAsync({ rating, comment: comment.trim() || undefined });
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
