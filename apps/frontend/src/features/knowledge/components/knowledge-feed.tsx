'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Heading } from '@/design-system/typography';
import { useDoctorById } from '@/features/doctor/hooks/use-doctor-by-id';
import { useArticle } from '@/features/knowledge/hooks/use-article';
import { useFollowDoctor } from '@/features/knowledge/hooks/use-follow-doctor';
import { useFollowedDoctors } from '@/features/knowledge/hooks/use-followed-doctors';
import { usePublishedArticles } from '@/features/knowledge/hooks/use-published-articles';
import { useSaveArticle } from '@/features/knowledge/hooks/use-save-article';
import { useSavedArticles } from '@/features/knowledge/hooks/use-saved-articles';
import { useUnfollowDoctor } from '@/features/knowledge/hooks/use-unfollow-doctor';
import { useUnsaveArticle } from '@/features/knowledge/hooks/use-unsave-article';
import type { KnowledgeArticle } from '@/features/knowledge/api/types';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

function ArticleAuthorName({ doctorProfileId }: { doctorProfileId: string }) {
  const t = useTranslations('knowledge.patient');
  const { data: doctor } = useDoctorById(doctorProfileId);
  return <span>{t('byDoctor', { name: doctor?.fullName ?? '…' })}</span>;
}

function ArticleCard({
  article,
  isSaved,
  onToggleSave,
  saving,
  isFollowing,
  onToggleFollow,
  followingPending,
}: {
  article: KnowledgeArticle;
  isSaved: boolean;
  onToggleSave: () => void;
  saving: boolean;
  isFollowing: boolean;
  onToggleFollow: () => void;
  followingPending: boolean;
}) {
  const t = useTranslations('knowledge.patient');
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-border-default p-4">
      <span className="font-medium text-text-primary">{article.title}</span>
      <span className="text-xs text-text-tertiary">
        <ArticleAuthorName doctorProfileId={article.authoringDoctorId} />
      </span>
      <p className="line-clamp-3 text-sm text-text-secondary">{article.body}</p>
      <div className="flex gap-2">
        <Button type="button" variant={isSaved ? 'outline' : 'primary'} size="sm" loading={saving} onClick={onToggleSave}>
          {isSaved ? t('unsaveAction') : t('saveAction')}
        </Button>
        <Button type="button" variant="outline" size="sm" loading={followingPending} onClick={onToggleFollow}>
          {isFollowing ? t('unfollowAction') : t('followAction')}
        </Button>
      </div>
    </li>
  );
}

function SavedArticleRow({ articleId, onUnsave, unsaving }: { articleId: string; onUnsave: () => void; unsaving: boolean }) {
  const t = useTranslations('knowledge.patient');
  const { data: article } = useArticle(articleId);
  return (
    <li className="flex items-center justify-between gap-2 rounded-2xl border border-border-default p-4">
      <span className="text-sm text-text-secondary">{article?.title ?? '…'}</span>
      <Button type="button" variant="outline" size="sm" loading={unsaving} onClick={onUnsave}>
        {t('unsaveAction')}
      </Button>
    </li>
  );
}

function FollowedDoctorRow({ doctorProfileId, onUnfollow, unfollowing }: {
  doctorProfileId: string;
  onUnfollow: () => void;
  unfollowing: boolean;
}) {
  const t = useTranslations('knowledge.patient');
  const { data: doctor } = useDoctorById(doctorProfileId);
  return (
    <li className="flex items-center justify-between gap-2 rounded-2xl border border-border-default p-4">
      <span className="font-medium text-text-primary">{doctor?.fullName ?? '…'}</span>
      <Button type="button" variant="outline" size="sm" loading={unfollowing} onClick={onUnfollow}>
        {t('unfollowAction')}
      </Button>
    </li>
  );
}

/**
 * I13 -- Knowledge Center (docs/01.1-prd-update.md §6): the patient-facing
 * browse/save/follow surface. Three tabs -- the public Published feed,
 * the patient's own saved articles, and their followed doctors -- all
 * against real `/knowledge/*` endpoints.
 */
export function KnowledgeFeed() {
  const t = useTranslations('knowledge.patient');
  const { data: feedResult, isLoading: feedLoading, isError: feedError } = usePublishedArticles();
  const { data: saved, isLoading: savedLoading, isError: savedError } = useSavedArticles();
  const { data: followed, isLoading: followedLoading, isError: followedError } = useFollowedDoctors();
  const save = useSaveArticle();
  const unsave = useUnsaveArticle();
  const follow = useFollowDoctor();
  const unfollow = useUnfollowDoctor();

  const savedArticleIds = useMemo(() => new Set((saved ?? []).map((s) => s.articleId)), [saved]);
  const followedDoctorIds = useMemo(() => new Set((followed ?? []).map((f) => f.doctorId)), [followed]);

  function toggleSave(article: KnowledgeArticle) {
    if (savedArticleIds.has(article.id)) {
      unsave.mutate(article.id);
    } else {
      save.mutate(article.id);
    }
  }

  function toggleFollow(doctorId: string) {
    if (followedDoctorIds.has(doctorId)) {
      unfollow.mutate(doctorId);
    } else {
      follow.mutate(doctorId);
    }
  }

  return (
    <Tabs defaultValue="feed" className="flex flex-col gap-4">
      <TabsList>
        <TabsTrigger value="feed">{t('feedTab')}</TabsTrigger>
        <TabsTrigger value="saved">{t('savedTab')}</TabsTrigger>
        <TabsTrigger value="following">{t('followedDoctorsTitle')}</TabsTrigger>
      </TabsList>

      <TabsContent value="feed" className="flex flex-col gap-4">
        {feedError && <Alert variant="danger">{t('loadError')}</Alert>}
        {feedLoading ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        ) : !feedResult || feedResult.articles.length === 0 ? (
          <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
        ) : (
          <ul className="flex flex-col gap-3">
            {feedResult.articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                isSaved={savedArticleIds.has(article.id)}
                onToggleSave={() => toggleSave(article)}
                saving={save.isPending || unsave.isPending}
                isFollowing={followedDoctorIds.has(article.authoringDoctorId)}
                onToggleFollow={() => toggleFollow(article.authoringDoctorId)}
                followingPending={follow.isPending || unfollow.isPending}
              />
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="saved" className="flex flex-col gap-4">
        {savedError && <Alert variant="danger">{t('loadError')}</Alert>}
        {savedLoading ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : !saved || saved.length === 0 ? (
          <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
        ) : (
          <ul className="flex flex-col gap-3">
            {saved.map((entry) => (
              <SavedArticleRow
                key={entry.id}
                articleId={entry.articleId}
                onUnsave={() => unsave.mutate(entry.articleId)}
                unsaving={unsave.isPending}
              />
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="following" className="flex flex-col gap-4">
        <Heading as="h2" level={4}>
          {t('followedDoctorsTitle')}
        </Heading>
        {followedError && <Alert variant="danger">{t('loadError')}</Alert>}
        {followedLoading ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : !followed || followed.length === 0 ? (
          <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
        ) : (
          <ul className="flex flex-col gap-3">
            {followed.map((entry) => (
              <FollowedDoctorRow
                key={entry.id}
                doctorProfileId={entry.doctorId}
                onUnfollow={() => unfollow.mutate(entry.doctorId)}
                unfollowing={unfollow.isPending}
              />
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}
