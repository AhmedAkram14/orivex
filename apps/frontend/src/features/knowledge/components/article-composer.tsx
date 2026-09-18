'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Heading } from '@/design-system/typography';
import { useMyAccount } from '@/features/identity/hooks/use-my-account';
import { ArticleCard } from '@/features/knowledge/components/article-card';
import { useAuthorArticle } from '@/features/knowledge/hooks/use-author-article';
import { useEditArticle } from '@/features/knowledge/hooks/use-edit-article';
import { useSubmitArticle } from '@/features/knowledge/hooks/use-submit-article';
import { useAutoGrowTextarea } from '@/shared/hooks/use-auto-grow-textarea';
import type { KnowledgeArticle, KnowledgeArticleLanguage } from '@/features/knowledge/api/types';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';

const TITLE_MAX = 200;
const BODY_MAX = 20000;
const TITLE_MIN_FOR_SUBMIT = 10;
const BODY_MIN_FOR_SUBMIT = 200;

export type ComposerMode = 'create' | { editing: KnowledgeArticle };

export interface ArticleComposerProps {
  mode: ComposerMode;
  onDone?: () => void;
}

/**
 * Knowledge Center Hardening Phase 3: the doctor's authoring surface --
 * rewritten from a single always-published "Publish article" button into a
 * real draft/submit-for-review/edit/preview flow. The same component
 * handles both "create a new article" (`mode: 'create'`) and "edit an
 * existing one" (`mode: { editing: article }`), pre-filling from the
 * article being edited and routing its submit actions through the edit
 * mutation instead of the author one. Collapsed behind a "Write an
 * article" trigger by the caller (`my-articles-list.tsx`) -- this
 * component itself is just the expanded form, no collapse state of its own.
 */
export function ArticleComposer({ mode, onDone }: ArticleComposerProps) {
  const t = useTranslations('knowledge.doctor');
  const editingArticle = typeof mode === 'object' ? mode.editing : null;

  const { data: account } = useMyAccount();
  const [title, setTitle] = useState(editingArticle?.title ?? '');
  const [body, setBody] = useState(editingArticle?.body ?? '');
  const [language, setLanguage] = useState<KnowledgeArticleLanguage | ''>(
    editingArticle?.language ??
      (account?.preferredLanguage === 'Arabic' || account?.preferredLanguage === 'English' ? account.preferredLanguage : ''),
  );
  const [sourcesText, setSourcesText] = useState(editingArticle?.sourcesText ?? '');
  const [showPreview, setShowPreview] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useAutoGrowTextarea(bodyRef, body);

  const author = useAuthorArticle();
  const edit = useEditArticle();
  const submit = useSubmitArticle();

  const isEditing = editingArticle !== null;
  const wasPublished = editingArticle?.status === 'published';
  const isBusy = author.isPending || edit.isPending || submit.isPending;
  const saveError = author.isError || edit.isError;

  function clearMessages() {
    setSuccessMessage(null);
  }

  function handleTitleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      bodyRef.current?.focus();
    }
  }

  // Both "Save draft" and "Submit for review" persist through the same
  // path: `author()`'s `saveAsDraft: true` (creating) or `edit()` (editing
  // in place, which never changes status except Published -> PendingReview)
  // -- never `author({ saveAsDraft: false })` here, since that branch skips
  // the 10/200-character length floor entirely (it's enforced only in
  // `submitForReview()`, per the domain entity's own comment). "Submit for
  // review" is this same persist step followed by an explicit `submit()`
  // call when the result is still a Draft.
  async function persistCurrentContent(): Promise<KnowledgeArticle | null> {
    if (!language) return null;
    if (isEditing && editingArticle) {
      return edit.mutateAsync({
        id: editingArticle.id,
        input: { title, body, language, sourcesText: sourcesText || undefined },
      });
    }
    return author.mutateAsync({ title, body, language, sourcesText: sourcesText || undefined, saveAsDraft: true });
  }

  async function handleSaveDraft() {
    clearMessages();
    try {
      const result = await persistCurrentContent();
      if (result) {
        setSuccessMessage(t('draftSavedMessage'));
        if (!isEditing) {
          setTitle('');
          setBody('');
        }
      }
    } catch {
      // Inline error rendered below from author.error/edit.error.
    }
  }

  const meetsLengthFloor = title.trim().length >= TITLE_MIN_FOR_SUBMIT && body.trim().length >= BODY_MIN_FOR_SUBMIT;

  async function handleConfirmSubmit() {
    clearMessages();
    try {
      const saved = await persistCurrentContent();
      if (!saved) return;

      // Only a still-Draft result needs the explicit submit call --
      // `edit()` on a Published article already reset it to PendingReview
      // server-side by itself.
      const finalArticle = saved.status === 'draft' ? await submit.mutateAsync(saved.id) : saved;

      if (isEditing && wasPublished) {
        setSuccessMessage(t('editResubmittedMessage'));
      } else {
        setSuccessMessage(finalArticle.status === 'published' ? t('submitSuccessPublished') : t('submitSuccessPending'));
      }
      if (!isEditing) {
        setTitle('');
        setBody('');
      } else {
        // Editing an existing article is a one-shot action from the list --
        // collapse back to it once the edit is safely submitted. Creating
        // (above) instead clears the fields and stays open, so the doctor
        // can see the success message and start another article right away.
        onDone?.();
      }
      setConfirmSubmitOpen(false);
    } catch {
      // Inline error rendered below from author.error/edit.error/submit.error.
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <Heading as="h2" level={4}>
          {isEditing ? t('editArticleTitle') : t('composerTitle')}
        </Heading>

        <form
          onSubmit={(event) => {
            event.preventDefault();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="knowledge-article-title" className="text-sm font-medium text-text-secondary">
              {t('titleLabel')}
            </label>
            <Input
              id="knowledge-article-title"
              dir="auto"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                clearMessages();
              }}
              onKeyDown={handleTitleKeyDown}
              placeholder={t('titlePlaceholder')}
              maxLength={TITLE_MAX}
            />
            <span className="text-xs text-text-tertiary">
              {title.length}/{TITLE_MAX}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="knowledge-article-body" className="text-sm font-medium text-text-secondary">
              {t('bodyLabel')}
            </label>
            <Textarea
              id="knowledge-article-body"
              ref={bodyRef}
              dir="auto"
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                clearMessages();
              }}
              placeholder={t('bodyPlaceholder')}
              maxLength={BODY_MAX}
            />
            <span className="text-xs text-text-tertiary">
              {body.length}/{BODY_MAX}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="knowledge-article-language" className="text-sm font-medium text-text-secondary">
              {t('languageLabel')}
            </label>
            <Select value={language} onValueChange={(value) => { setLanguage(value as KnowledgeArticleLanguage); clearMessages(); }}>
              <SelectTrigger id="knowledge-article-language" className="w-56" aria-label={t('languageLabel')}>
                <SelectValue placeholder={t('languagePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arabic">{t('languageOptions.Arabic')}</SelectItem>
                <SelectItem value="English">{t('languageOptions.English')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="knowledge-article-sources" className="text-sm font-medium text-text-secondary">
              {t('sourcesLabel')}
            </label>
            <Textarea
              id="knowledge-article-sources"
              dir="auto"
              value={sourcesText}
              onChange={(event) => setSourcesText(event.target.value)}
              placeholder={t('sourcesPlaceholder')}
              rows={3}
              maxLength={2000}
            />
            <span className="text-xs text-text-tertiary">{t('sourcesHint')}</span>
          </div>

          <Alert variant="info">{t('composerDisclaimer')}</Alert>

          {saveError && <Alert variant="danger">{t('submitError')}</Alert>}
          {submit.isError && <Alert variant="danger">{t('submitError')}</Alert>}
          {successMessage && <Alert variant="success">{successMessage}</Alert>}

          {!meetsLengthFloor && (
            <p className="text-xs text-text-tertiary">
              {t('lengthFloorHelper', { titleMin: TITLE_MIN_FOR_SUBMIT, bodyMin: BODY_MIN_FOR_SUBMIT })}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" loading={isBusy && !confirmSubmitOpen} disabled={!language} onClick={handleSaveDraft}>
              {t('saveDraftAction')}
            </Button>
            <Button
              type="button"
              disabled={!meetsLengthFloor || !language}
              onClick={() => setConfirmSubmitOpen(true)}
            >
              {t('submitForReviewAction')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowPreview((value) => !value)}>
              {showPreview ? t('hidePreviewAction') : t('previewAction')}
            </Button>
          </div>
        </form>

        {showPreview && language && (
          <div className="flex flex-col gap-2">
            <Heading as="h3" level={4}>
              {t('previewHeading')}
            </Heading>
            <ul>
              <ArticleCard article={{ title, body, language, sourcesText }} />
            </ul>
          </div>
        )}
      </CardContent>

      <Dialog open={confirmSubmitOpen} onOpenChange={(open) => !open && setConfirmSubmitOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmSubmitTitle')}</DialogTitle>
            <DialogDescription>
              {isEditing && wasPublished ? t('confirmSubmitDescriptionReReview') : t('confirmSubmitDescriptionFirstTime')}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSubmitOpen(false)}>
              {t('cancel')}
            </Button>
            <Button loading={isBusy} onClick={handleConfirmSubmit}>
              {t('confirmSubmitAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
