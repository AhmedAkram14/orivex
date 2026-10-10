import { FileText, FlaskConical, HeartPulse, Stethoscope, type LucideIcon } from 'lucide-react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

/**
 * The four kinds of record on the Medical Records page, each with ONE glyph and ONE tint used everywhere it
 * appears -- the tab, the Overview card and every row -- so a visit always looks like a visit. Tints are the
 * existing `*-subtle` fills (their own dark values) with the matching `*-emphasis` glyph.
 */
export type RecordKind = 'visit' | 'condition' | 'document' | 'result';

export const RECORD_KINDS: Record<RecordKind, { icon: LucideIcon; tint: string }> = {
  visit: { icon: Stethoscope, tint: 'bg-info-subtle text-info-emphasis' },
  condition: { icon: HeartPulse, tint: 'bg-warning-subtle text-warning-emphasis' },
  document: { icon: FileText, tint: 'bg-primary-subtle text-primary-emphasis' },
  result: { icon: FlaskConical, tint: 'bg-success-subtle text-success-emphasis' },
};

/** The kind's glyph on its tint: `sm` (24px, tabs) or `md` (32px, rows and card headers). */
export function RecordKindIcon({ kind, icon, size = 'md', className }: { kind: RecordKind; icon?: LucideIcon; size?: 'sm' | 'md'; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        size === 'sm' ? 'size-6' : 'size-8',
        RECORD_KINDS[kind].tint,
        className,
      )}
    >
      <Icon icon={icon ?? RECORD_KINDS[kind].icon} size={size === 'sm' ? 'xs' : 'sm'} />
    </span>
  );
}

export type NoteSection = 'subjective' | 'objective' | 'assessment' | 'plan';

const SECTION_BY_LETTER: Record<string, NoteSection> = { S: 'subjective', O: 'objective', A: 'assessment', P: 'plan' };

/**
 * A visit note as the backend writes it ("S: ...\n\nO: ...\n\nA: ...\n\nP: ...", ClinicalNote.author) split
 * into its four parts. A note in any other shape (an older free-text one) comes back as one untitled part.
 */
export function parseVisitNote(content: string | undefined): { section?: NoteSection; text: string }[] {
  const text = (content ?? '').trim();
  if (!text) return [];
  const parts = text.split(/\n\s*\n(?=[SOAP]: )/);
  const parsed = parts.map((part) => {
    const match = /^([SOAP]): ([\s\S]*)$/.exec(part.trim());
    return match ? { section: SECTION_BY_LETTER[match[1]], text: match[2].trim() } : null;
  });
  if (parsed.some((part) => part === null)) return [{ text }];
  return parsed as { section: NoteSection; text: string }[];
}

/** The note's one-line summary: the doctor's own assessment when the note has one, else its first line. */
export function visitSummary(content: string | undefined): string {
  const parts = parseVisitNote(content);
  const assessment = parts.find((part) => part.section === 'assessment');
  return (assessment ?? parts[0])?.text.split('\n')[0] ?? '';
}

/** "PDF", "JPG", "PNG" -- or the subtype in capitals for anything else. */
export function fileFormatLabel(contentType: string): string {
  if (contentType === 'application/pdf') return 'PDF';
  if (contentType === 'image/jpeg') return 'JPG';
  const subtype = contentType.split('/')[1] ?? contentType;
  return subtype.toUpperCase();
}
