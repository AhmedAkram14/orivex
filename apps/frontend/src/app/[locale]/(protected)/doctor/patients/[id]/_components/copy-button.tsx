'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';

export interface CopyButtonProps {
  value: string;
  label: string;
  copiedLabel: string;
}

// P1: first reusable copy-to-clipboard control on this page (previously only
// one inline, non-reusable example existed in ai-suggestion-card.tsx). Icon-
// only, so both `label` (idle) and `copiedLabel` (post-copy, ~2s) drive the
// aria-label -- never a bare icon with no text equivalent.
export function CopyButton({ value, label, copiedLabel }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context) -- silently
      // no-op is fine here, same posture as ai-suggestion-card.tsx's copy button.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="print-hidden size-6 shrink-0 text-text-tertiary"
      aria-label={copied ? copiedLabel : label}
      onClick={handleCopy}
    >
      <Icon icon={copied ? Check : Copy} size="xs" />
    </Button>
  );
}
