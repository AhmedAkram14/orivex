'use client';

import { useMutation } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import type { AISuggestionDecision } from '@/features/consultation/api/types';

export interface RecordAIDecisionInput {
  suggestionId: string;
  decision: AISuggestionDecision;
  justification?: string;
}

/**
 * AI Copilot (docs/01.1-prd-update.md §4): records the doctor's explicit
 * approve/edit/reject decision on one AI suggestion. This only ever writes
 * to AISuggestion's own decision fields -- it never creates a ClinicalNote,
 * Prescription, or Diagnosis. Any of those remain a separate, explicit
 * doctor action through the workspace's existing Notes/Prescriptions/
 * Diagnosis tabs.
 */
export function useRecordAIDecision() {
  return useMutation({
    mutationFn: ({ suggestionId, decision, justification }: RecordAIDecisionInput) =>
      consultationApi.recordAIDecision(suggestionId, decision, justification),
  });
}
