'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface TagInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  /** The stored value: the tags joined with ", " (the API keeps these as one free-text field). */
  value: string;
  onValueChange: (value: string) => void;
}

const SEPARATOR = /[,;\n]/;

function toTags(value: string): string[] {
  return value
    .split(SEPARATOR)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/**
 * A chip input for a comma-separated free-text field (allergies, chronic
 * conditions): Enter, a comma or leaving the field commits what you typed as a
 * chip; each chip has a remove button. The stored value stays the plain
 * ", "-joined string the API already accepts, so no contract changes.
 */
export const TagInput = forwardRef<HTMLInputElement, TagInputProps>(
  ({ value, onValueChange, className, onBlur, onKeyDown, ...inputProps }, ref) => {
    const t = useTranslations('tagInput');
    const [draft, setDraft] = useState('');
    const tags = toTags(value);

    function commit(text: string) {
      const additions = toTags(text).filter((tag) => !tags.some((existing) => existing.toLowerCase() === tag.toLowerCase()));
      if (additions.length > 0) onValueChange([...tags, ...additions].join(', '));
      setDraft('');
    }

    return (
      <div
        className={cn(
          'flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-(--r-control) border border-border-strong bg-surface px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2 focus-within:ring-offset-canvas',
          className,
        )}
      >
        {tags.map((tag) => (
          <span key={tag} className="inline-flex h-7 items-center gap-1 rounded-full bg-surface-2 ps-3 pe-1 text-small font-medium text-text-primary">
            <bdi>{tag}</bdi>
            <button
              type="button"
              aria-label={t('remove', { tag })}
              onClick={() => onValueChange(tags.filter((existing) => existing !== tag).join(', '))}
              className="flex size-5 items-center justify-center rounded-full text-text-tertiary hover:bg-border-default hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <Icon icon={X} size="xs" />
            </button>
          </span>
        ))}
        <input
          ref={ref}
          value={draft}
          dir="auto"
          onChange={(event) => {
            const next = event.target.value;
            if (SEPARATOR.test(next)) commit(next);
            else setDraft(next);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && draft.trim()) {
              event.preventDefault();
              commit(draft);
            } else if (event.key === 'Backspace' && !draft && tags.length > 0) {
              onValueChange(tags.slice(0, -1).join(', '));
            }
            onKeyDown?.(event);
          }}
          onBlur={(event) => {
            if (draft.trim()) commit(draft);
            onBlur?.(event);
          }}
          className="min-w-32 flex-1 bg-transparent py-1 text-body text-text-primary outline-none placeholder:text-text-tertiary"
          {...inputProps}
        />
      </div>
    );
  },
);
TagInput.displayName = 'TagInput';
