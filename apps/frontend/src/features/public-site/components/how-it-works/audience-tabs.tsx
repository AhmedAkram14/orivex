'use client';

import { useTranslations } from 'next-intl';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useDirection } from '@/shared/i18n/use-direction';
import { cn } from '@/shared/lib/cn';

export const AUDIENCES = ['patients', 'doctors'] as const;
export type Audience = (typeof AUDIENCES)[number];

const AudienceContext = createContext<{ audience: Audience; setAudience: (audience: Audience) => void } | null>(null);

function useAudience() {
  const value = useContext(AudienceContext);
  if (!value) throw new Error('Audience tabs must be used inside <AudienceTabsProvider>.');
  return value;
}

/**
 * Shares the Patients/Doctors choice between the toggle (in the page hero) and
 * the two timelines further down. `#patients` / `#doctors` in the URL selects
 * a tab, so either audience can be linked to directly.
 */
export function AudienceTabsProvider({ children }: { children: ReactNode }) {
  const [audience, setAudienceState] = useState<Audience>('patients');

  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.slice(1);
      if ((AUDIENCES as readonly string[]).includes(hash)) setAudienceState(hash as Audience);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);

  const value = useMemo(
    () => ({
      audience,
      setAudience: (next: Audience) => {
        setAudienceState(next);
        window.history.replaceState(null, '', `#${next}`);
      },
    }),
    [audience],
  );

  return <AudienceContext.Provider value={value}>{children}</AudienceContext.Provider>;
}

/** WAI-ARIA tabs: Left/Right (mirrored in RTL), Home and End move between tabs; only the selected tab is in the tab order. */
export function AudienceTabList() {
  const t = useTranslations('publicSite.howItWorksPage.toggle');
  const { audience, setAudience } = useAudience();
  const direction = useDirection();
  const refs = useRef<Record<Audience, HTMLButtonElement | null>>({ patients: null, doctors: null });

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = AUDIENCES.indexOf(audience);
    const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    let next: number | null = null;
    if (event.key === forward) next = (index + 1) % AUDIENCES.length;
    if (event.key === backward) next = (index - 1 + AUDIENCES.length) % AUDIENCES.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = AUDIENCES.length - 1;
    if (next === null) return;
    event.preventDefault();
    setAudience(AUDIENCES[next]);
    refs.current[AUDIENCES[next]]?.focus();
  }

  return (
    <div role="tablist" aria-label={t('label')} onKeyDown={onKeyDown} className="flex w-fit gap-1 rounded-full border border-border-default bg-surface p-1">
      {AUDIENCES.map((option) => {
        const selected = option === audience;
        return (
          <button
            key={option}
            ref={(element) => {
              refs.current[option] = element;
            }}
            type="button"
            role="tab"
            id={`tab-${option}`}
            aria-selected={selected}
            aria-controls={`panel-${option}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => setAudience(option)}
            className={cn(
              'h-10 rounded-full px-5 text-small font-semibold transition-colors duration-(--duration-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring pointer-coarse:min-h-11',
              selected ? 'bg-primary text-primary-foreground' : 'text-text-secondary hover:bg-surface-2',
            )}
          >
            {t(option)}
          </button>
        );
      })}
    </div>
  );
}

export function AudienceTabPanel({ audience, children }: { audience: Audience; children: ReactNode }) {
  const { audience: selected } = useAudience();
  return (
    <div role="tabpanel" id={`panel-${audience}`} aria-labelledby={`tab-${audience}`} hidden={selected !== audience} tabIndex={0} className="focus-visible:outline-none">
      {children}
    </div>
  );
}
