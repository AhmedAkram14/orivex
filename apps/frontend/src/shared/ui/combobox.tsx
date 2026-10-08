'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useId, useRef, useState, type ReactNode, type Ref } from 'react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/shared/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Extra words that find this option (e.g. the other language's name). */
  keywords?: string[];
  /** Shown before the label, in the list and in the field (e.g. a specialty glyph). */
  leading?: ReactNode;
}

export interface ComboboxProps {
  options: readonly ComboboxOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  id?: string;
  labelledBy?: string;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
  triggerRef?: Ref<HTMLButtonElement>;
  className?: string;
}

/**
 * A searchable single choice for long lists (specialty, hospital): a field-like trigger and a filtered list.
 * The list always opens below the field -- a low field is first scrolled up to the middle of the screen -- and
 * shrinks to the space available, so it never flips up over the page's title and stepper.
 */
export function Combobox({
  options,
  value,
  onChange,
  onBlur,
  placeholder,
  searchPlaceholder,
  emptyText,
  id,
  labelledBy,
  invalid,
  describedBy,
  disabled,
  triggerRef,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const trigger = useRef<HTMLButtonElement | null>(null);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        // Make room below before opening: bring a low field up to the middle of the screen.
        if (next && trigger.current) {
          const { top } = trigger.current.getBoundingClientRect();
          if (top > window.innerHeight * 0.5) trigger.current.scrollIntoView({ block: 'center' });
        }
        setOpen(next);
        if (!next) onBlur?.();
      }}
    >
      <PopoverTrigger asChild>
        <button
          ref={(element) => {
            trigger.current = element;
            if (typeof triggerRef === 'function') triggerRef(element);
            else if (triggerRef)
              (triggerRef as { current: HTMLButtonElement | null }).current = element;
          }}
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          aria-labelledby={labelledBy && id ? `${labelledBy} ${id}` : labelledBy}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full min-w-0 items-center gap-2 rounded-md border border-border-default bg-surface px-3 text-start text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-(--opacity-disabled)',
            'aria-[invalid=true]:border-danger',
            className,
          )}
        >
          {selected?.leading}
          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              selected ? 'text-text-primary' : 'text-text-tertiary',
            )}
          >
            {selected ? <bdi>{selected.label}</bdi> : placeholder}
          </span>
          <Icon icon={ChevronDown} size="sm" className="shrink-0 text-text-tertiary" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        // Always below the field (never flipped up over the page's title and stepper), shrinking to the room left.
        avoidCollisions={false}
        collisionPadding={{ bottom: 12, left: 12, right: 12 }}
        className="w-(--radix-popover-trigger-width) min-w-56 p-0"
      >
        <Command
          filter={(itemValue, search, keywords) => {
            // Items are keyed by id; their label and keywords are what a search matches.
            const haystack = (keywords ?? [itemValue]).join(' ').toLocaleLowerCase();
            return haystack.includes(search.trim().toLocaleLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList
            id={listId}
            className="max-h-[min(18rem,calc(var(--radix-popover-content-available-height)-3rem))]"
          >
            <CommandEmpty>{emptyText}</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                keywords={[option.label, ...(option.keywords ?? [])]}
                onSelect={() => {
                  onChange(option.value);
                  setOpen(false);
                  onBlur?.();
                }}
              >
                {option.leading}
                <span className="min-w-0 flex-1 truncate">
                  <bdi>{option.label}</bdi>
                </span>
                {option.value === value && (
                  <Icon icon={Check} size="sm" className="shrink-0 text-text-primary" />
                )}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
