'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Check, Copy, RefreshCw, ShieldAlert, Sparkles, X } from 'lucide-react';
import type { AISuggestion } from '@/features/consultation/api/types';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/icons/icon';
import { Textarea } from '@/shared/ui/textarea';

export interface AISuggestionCardProps {
  suggestion: AISuggestion;
  onApprove: () => void;
  onReject: (justification: string) => void;
  onSaveEdit: (editedContent: string) => void;
  onRegenerate: () => void;
  isDeciding: boolean;
  isRegenerating: boolean;
}

/**
 * One AI-generated draft, always shown with its "AI-generated draft --
 * review before use" banner and never auto-applied anywhere (docs/01.1-
 * prd-update.md §4, CLAUDE.md: "AI never writes directly to clinical
 * records"). `interaction_flag` gets a visually distinct, safety-oriented
 * treatment (docs/01-prd.md §8: "a safety net, not a creative/generative
 * task") -- still explicitly an AI-generated flag, never presented as a
 * confirmed clinical fact.
 *
 * Backend constraint this respects (AISuggestion.content is `readonly` --
 * the real domain entity has no field for edited text, only a
 * decisionJustification string alongside the immutable original content):
 * "Edit" does not rewrite the AI's own record, it captures what the doctor
 * actually used/changed as the decision's justification -- the original
 * suggestion stays exactly as generated, for audit purposes.
 */
export function AISuggestionCard({
  suggestion,
  onApprove,
  onReject,
  onSaveEdit,
  onRegenerate,
  isDeciding,
  isRegenerating,
}: AISuggestionCardProps) {
  const t = useTranslations('consultation.workspace.copilot');
  const format = useFormatter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(suggestion.content);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectJustification, setRejectJustification] = useState('');
  const [rejectValidationError, setRejectValidationError] = useState(false);
  const [copied, setCopied] = useState(false);

  const isInteractionFlag = suggestion.suggestionType === 'interaction_flag';
  const decided = suggestion.doctorDecision !== null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(suggestion.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context) -- a
      // non-critical convenience, so this fails silently rather than
      // interrupting the doctor with an error for a copy button.
    }
  }

  function handleReject() {
    if (!rejectJustification.trim()) {
      setRejectValidationError(true);
      return;
    }
    onReject(rejectJustification.trim());
  }

  function handleSaveEdit() {
    onSaveEdit(editedContent.trim());
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border p-3 ${
        isInteractionFlag ? 'border-danger/40 bg-danger-subtle/40' : 'border-border-default bg-surface'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon
            icon={isInteractionFlag ? ShieldAlert : Sparkles}
            size="sm"
            className={isInteractionFlag ? 'text-danger' : 'text-primary'}
            label=""
          />
          <Badge variant={isInteractionFlag ? 'danger' : 'primary'}>
            {t(`typeLabel.${suggestion.suggestionType}`)}
          </Badge>
        </div>
        <span className="text-xs text-text-tertiary">
          {t('generatedAt', {
            time: format.dateTime(new Date(suggestion.generatedAt), { hour: '2-digit', minute: '2-digit' }),
          })}
        </span>
      </div>

      <Alert variant={isInteractionFlag ? 'danger' : 'info'} className="text-xs">
        {isInteractionFlag ? t('safetyFlagNotice') : t('draftNotice')}
      </Alert>

      {isEditing ? (
        <Textarea
          value={editedContent}
          onChange={(event) => setEditedContent(event.target.value)}
          rows={6}
          disabled={isDeciding}
          aria-label={t('editContentLabel')}
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm text-text-secondary">{suggestion.content}</p>
      )}

      {isRejecting && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`reject-justification-${suggestion.id}`} className="text-xs font-medium text-text-primary">
            {t('rejectJustificationLabel')}
          </label>
          <Textarea
            id={`reject-justification-${suggestion.id}`}
            value={rejectJustification}
            onChange={(event) => {
              setRejectJustification(event.target.value);
              setRejectValidationError(false);
            }}
            placeholder={t('rejectJustificationPlaceholder')}
            rows={2}
            aria-invalid={rejectValidationError}
            disabled={isDeciding}
          />
          {rejectValidationError && <p className="text-xs text-danger">{t('rejectJustificationRequired')}</p>}
        </div>
      )}

      {decided ? (
        <Alert variant={suggestion.doctorDecision === 'rejected' ? 'danger' : 'success'}>
          {t(`decision${suggestion.doctorDecision === 'approved' ? 'Approved' : suggestion.doctorDecision === 'edited' ? 'Edited' : 'Rejected'}`)}
        </Alert>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {isEditing ? (
            <>
              <Button type="button" size="sm" loading={isDeciding} onClick={handleSaveEdit}>
                {t('save')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeciding}
                onClick={() => {
                  setIsEditing(false);
                  setEditedContent(suggestion.content);
                }}
              >
                {t('cancel')}
              </Button>
            </>
          ) : isRejecting ? (
            <>
              <Button type="button" variant="danger" size="sm" loading={isDeciding} onClick={handleReject}>
                {t('reject')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeciding}
                onClick={() => {
                  setIsRejecting(false);
                  setRejectJustification('');
                  setRejectValidationError(false);
                }}
              >
                {t('cancel')}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" size="sm" loading={isDeciding} onClick={onApprove}>
                <Icon icon={Check} size="sm" label="" />
                {t('approve')}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={isDeciding} onClick={() => setIsEditing(true)}>
                {t('edit')}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={isDeciding} onClick={() => setIsRejecting(true)}>
                <Icon icon={X} size="sm" label="" />
                {t('reject')}
              </Button>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-border-default pt-2">
        <Button type="button" variant="ghost" size="sm" loading={isRegenerating} disabled={isDeciding} onClick={onRegenerate}>
          <Icon icon={RefreshCw} size="sm" label="" />
          {t('regenerate')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleCopy}>
          <Icon icon={Copy} size="sm" label="" />
          {copied ? t('copied') : t('copy')}
        </Button>
      </div>
    </div>
  );
}
