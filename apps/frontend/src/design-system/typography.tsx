import type { ElementType, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface PolymorphicProps {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

/** Large marketing/hero-scale text. Rare — most screens should reach for Heading. */
export function Display({ as: Component = 'h1', className, children }: PolymorphicProps) {
  return (
    <Component className={cn('text-4xl font-bold tracking-tight text-primary', className)}>
      {children}
    </Component>
  );
}

interface HeadingProps extends PolymorphicProps {
  level?: 1 | 2 | 3 | 4;
}

const headingSizeByLevel: Record<NonNullable<HeadingProps['level']>, string> = {
  1: 'text-3xl font-semibold tracking-tight',
  2: 'text-2xl font-semibold tracking-tight',
  3: 'text-xl font-semibold',
  4: 'text-lg font-semibold',
};

/** Section/page headings. `level` controls visual size; `as` controls the semantic tag — they are independent so visual hierarchy never forces an incorrect heading nesting order. */
export function Heading({ as, level = 2, className, children }: HeadingProps) {
  const Component = as ?? (`h${level}` as ElementType);
  return (
    <Component className={cn(headingSizeByLevel[level], 'text-text-primary', className)}>
      {children}
    </Component>
  );
}

interface TextProps extends PolymorphicProps {
  size?: 'sm' | 'base' | 'lg';
  tone?: 'primary' | 'secondary' | 'tertiary';
}

const textSizeClass: Record<NonNullable<TextProps['size']>, string> = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
};

const textToneClass: Record<NonNullable<TextProps['tone']>, string> = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  tertiary: 'text-text-tertiary',
};

/** Body copy. */
export function Text({ as: Component = 'p', size = 'base', tone = 'primary', className, children }: TextProps) {
  return (
    <Component className={cn(textSizeClass[size], textToneClass[tone], className)}>
      {children}
    </Component>
  );
}

/** Small supporting text — captions, hints, metadata. */
export function Caption({ as: Component = 'span', className, children }: PolymorphicProps) {
  return (
    <Component className={cn('text-xs text-text-tertiary', className)}>{children}</Component>
  );
}

/** Inline or block monospace text — identifiers, code, technical values. */
export function Code({
  as: Component = 'code',
  className,
  children,
}: PolymorphicProps) {
  return (
    <Component
      className={cn(
        'rounded-sm bg-secondary-subtle px-1.5 py-0.5 font-mono text-sm text-text-primary',
        className,
      )}
    >
      {children}
    </Component>
  );
}
