'use client';

import { useEffect, useState } from 'react';

/**
 * Imperative toast store — a plain module-level pub/sub, not a React
 * context. This is deliberate: `reportQueryError` (shared/lib/api/error.ts)
 * needs to raise a toast from TanStack Query's global error callback, which
 * runs outside any component tree and can't call a hook. `toast()` below is
 * callable from anywhere; `useToast()` is only for the one component
 * (Toaster) that needs to reactively render whatever's currently active.
 */
export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'danger';
  /** Milliseconds before auto-dismiss. */
  duration?: number;
}

interface ToastRecord extends ToastOptions {
  id: string;
}

const TOAST_LIMIT = 3;
const DEFAULT_DURATION = 5000;

let toasts: ToastRecord[] = [];
const listeners = new Set<(toasts: ToastRecord[]) => void>();

function emit() {
  for (const listener of listeners) listener(toasts);
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function toast(options: ToastOptions): string {
  const id = crypto.randomUUID();
  toasts = [{ id, ...options }, ...toasts].slice(0, TOAST_LIMIT);
  emit();

  const duration = options.duration ?? DEFAULT_DURATION;
  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration);
  }

  return id;
}

export function useToast() {
  const [state, setState] = useState<ToastRecord[]>(toasts);

  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return { toasts: state, dismiss: dismissToast };
}
