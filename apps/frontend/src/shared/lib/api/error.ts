import { ApiError } from '@/shared/lib/api/client';
import { toast } from '@/shared/ui/use-toast';

/**
 * The single error-handling convention Phase 2 requires: however an error
 * reaches the UI (a failed query, a failed mutation, a caught exception),
 * it goes through this function to become a consistent user-facing toast.
 * A feature can still show a more specific inline message (e.g. a form
 * field error) in addition to this — this is the catch-all, not the only
 * layer.
 */
export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

export function reportQueryError(error: unknown): void {
  toast({
    variant: 'danger',
    title: 'Request failed',
    description: toUserMessage(error),
  });
}
