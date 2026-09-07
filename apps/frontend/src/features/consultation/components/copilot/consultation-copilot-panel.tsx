'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ClipboardList, FileText, MessageCircleQuestion, Pill, ShieldAlert, Sparkles } from 'lucide-react';
import { useRecordAIDecision } from '@/features/consultation/hooks/use-record-ai-decision';
import { useRequestAISuggestion } from '@/features/consultation/hooks/use-request-ai-suggestion';
import type { AISuggestion, AISuggestionType } from '@/features/consultation/api/types';
import { AISuggestionCard } from '@/features/consultation/components/copilot/ai-suggestion-card';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/icons/icon';

export interface ConsultationCopilotPanelProps {
  consultationSessionId: string;
  /** Real backend requirement (RequestAISuggestionUseCase): a suggestion may only be requested while the session is InProgress. Mirrored client-side so the panel never offers an action the server would 403 -- the server remains the actual enforcement point. */
  isConsultationInProgress: boolean;
}

const SUGGESTION_TYPES: readonly AISuggestionType[] = [
  'summary',
  'soap_draft',
  'suggested_question',
  'prescription_draft',
  'interaction_flag',
  'follow_up_plan',
];

const TYPE_ICON: Record<AISuggestionType, typeof Sparkles> = {
  summary: ClipboardList,
  soap_draft: FileText,
  suggested_question: MessageCircleQuestion,
  prescription_draft: Pill,
  interaction_flag: ShieldAlert,
  follow_up_plan: Sparkles,
};

/**
 * AI Copilot (docs/01.1-prd-update.md §4): "a contextual side panel that
 * surfaces relevant suggestions based on where the doctor is in their
 * workflow... never presented as a chat interface." A defined
 * quiet/collapsed state is a named requirement there too ("a doctor should
 * be able to dismiss or minimize it without losing... property") --
 * collapsing here only hides the panel, generated suggestions stay in
 * `suggestionsByType` regardless (state lives in this component, not the
 * DOM, so nothing is lost).
 *
 * Uses the real, already-shipped POST /ai/suggestions and PATCH
 * /ai/suggestions/:id endpoints only (ORIVEX Remaining Work Audit C7) --
 * no new backend surface, no fabricated content. One suggestion shown per
 * type at a time (the latest -- "Regenerate" replaces it with a fresh real
 * request); there is no GET-by-id endpoint to list a full history, which is
 * a real, disclosed backend limitation, not an oversight here.
 */
export function ConsultationCopilotPanel({ consultationSessionId, isConsultationInProgress }: ConsultationCopilotPanelProps) {
  const t = useTranslations('consultation.workspace.copilot');
  const [collapsed, setCollapsed] = useState(false);
  const [suggestionsByType, setSuggestionsByType] = useState<Partial<Record<AISuggestionType, AISuggestion>>>({});
  const [activeType, setActiveType] = useState<AISuggestionType | null>(null);
  const [unavailableWarning, setUnavailableWarning] = useState<string | null>(null);

  const requestSuggestion = useRequestAISuggestion(consultationSessionId);
  const recordDecision = useRecordAIDecision();

  async function handleRequest(suggestionType: AISuggestionType) {
    setActiveType(suggestionType);
    setUnavailableWarning(null);
    try {
      const result = await requestSuggestion.mutateAsync(suggestionType);
      if ('status' in result && result.status === 'unavailable') {
        setUnavailableWarning(result.warnings[0] ?? t('unavailable'));
        return;
      }
      setSuggestionsByType((prev) => ({ ...prev, [suggestionType]: result }));
    } catch {
      // Surfaced via requestSuggestion.isError below -- the rest of the
      // consultation (video, notes, vitals, diagnosis, prescriptions,
      // journey) stays fully usable regardless of this failure.
    } finally {
      setActiveType(null);
    }
  }

  function handleDecision(suggestion: AISuggestion, decision: 'approved' | 'edited' | 'rejected', justification?: string) {
    recordDecision.mutate(
      { suggestionId: suggestion.id, decision, justification },
      {
        onSuccess: (updated) => {
          setSuggestionsByType((prev) => ({ ...prev, [suggestion.suggestionType]: updated }));
        },
      },
    );
  }

  if (collapsed) {
    return (
      <div className="flex w-12 shrink-0 flex-col items-center gap-2 border-s border-border-default pt-1 ps-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(false)}
          aria-label={t('expand')}
          aria-expanded={false}
        >
          <Icon icon={Sparkles} size="sm" label="" className="text-primary" />
        </Button>
      </div>
    );
  }

  return (
    <aside
      aria-label={t('title')}
      className="flex w-full shrink-0 flex-col gap-3 border-s border-border-default ps-4 sm:w-72"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon icon={Sparkles} size="sm" className="text-primary" label="" />
          <span className="text-sm font-semibold text-text-primary">{t('title')}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(true)}
          aria-label={t('collapse')}
          aria-expanded={true}
        >
          <Icon icon={ChevronLeft} size="sm" flipRtl label="" />
        </Button>
      </div>
      <p className="text-xs text-text-tertiary">{t('subtitle')}</p>

      {!isConsultationInProgress ? (
        <Alert variant="info">{t('notActiveNotice')}</Alert>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            {SUGGESTION_TYPES.map((type) => (
              <Button
                key={type}
                type="button"
                variant="outline"
                size="sm"
                className="justify-start"
                loading={activeType === type}
                disabled={requestSuggestion.isPending}
                onClick={() => handleRequest(type)}
              >
                <Icon icon={TYPE_ICON[type]} size="sm" label="" />
                {t(`actions.${type}`)}
              </Button>
            ))}
          </div>

          {unavailableWarning && <Alert variant="info">{unavailableWarning}</Alert>}
          {requestSuggestion.isError && <Alert variant="danger">{t('requestError')}</Alert>}

          <div className="flex flex-col gap-3">
            {SUGGESTION_TYPES.filter((type) => suggestionsByType[type]).map((type) => {
              const suggestion = suggestionsByType[type]!;
              return (
                <AISuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  isDeciding={recordDecision.isPending && recordDecision.variables?.suggestionId === suggestion.id}
                  isRegenerating={activeType === type}
                  onApprove={() => handleDecision(suggestion, 'approved')}
                  onReject={(justification) => handleDecision(suggestion, 'rejected', justification)}
                  onSaveEdit={(editedContent) => handleDecision(suggestion, 'edited', editedContent)}
                  onRegenerate={() => handleRequest(type)}
                />
              );
            })}
          </div>
          {recordDecision.isError && <Alert variant="danger">{t('decisionError')}</Alert>}
        </>
      )}
    </aside>
  );
}
