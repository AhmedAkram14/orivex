'use client';

import { useMutation } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import type { AISuggestionType } from '@/features/consultation/api/types';

/**
 * AI Copilot (docs/01.1-prd-update.md §4): no query cache to invalidate --
 * there is no GET endpoint that reads suggestions back (the real backend
 * only exposes POST to create one and PATCH to decide on it), so
 * ConsultationCopilotPanel keeps the returned suggestions in its own local
 * state, keyed by suggestionType, exactly as returned. Explicit,
 * user-triggered only -- never called on mount/tab-change/render.
 */
export function useRequestAISuggestion(consultationSessionId: string) {
  return useMutation({
    mutationFn: (suggestionType: AISuggestionType) =>
      consultationApi.requestAISuggestion(consultationSessionId, suggestionType),
  });
}
