import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { Spinner } from '@/shared/ui/spinner';

export const buttonVariants = cva(
  // Hover lifts 1px (motion-safe only); press scales to .98 at 90ms; focus is a
  // 2px care ring with 2px offset; disabled is 45% opacity with no hover.
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-(--r-control) text-sm font-medium transition-[background-color,color,border-color,filter,transform,opacity] duration-(--duration-fast) ease-(--ease-standard) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-[0.98] motion-safe:active:duration-90 disabled:pointer-events-none disabled:opacity-(--opacity-disabled)',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active',
        accent:
          'bg-pulse text-pulse-foreground hover:brightness-[0.94]',
        secondary:
          'border border-border-strong bg-surface text-text-primary hover:bg-surface-2',
        ghost: 'bg-transparent text-text-primary hover:bg-surface-2',
        destructive:
          'border border-danger bg-transparent text-danger-emphasis hover:bg-danger-subtle',
        // Solid danger fill: ONLY inside ConfirmDialog. Everywhere else a destructive action is `destructive` (outlined).
        'destructive-solid': 'bg-danger text-danger-foreground hover:bg-danger/90',
        link: 'h-auto rounded-sm px-0 text-care-text underline-offset-4 hover:underline',

      },
      size: {
        // 36 / 40 / 48. `pointer-coarse` lifts each to the 44px touch minimum on touch screens.
        sm: 'h-9 rounded-(--r-sm) px-3.5 text-sm pointer-coarse:min-h-11',
        md: 'h-10 px-4 pointer-coarse:min-h-11',
        lg: 'h-12 px-6 text-base',
        icon: 'size-10 pointer-coarse:min-h-11 pointer-coarse:min-w-11',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Renders the child element instead of a <button>, forwarding all props/classes onto it (Radix's composition pattern) — used to make e.g. a Next.js <Link> look like a button without nesting interactive elements. */
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const sharedProps = {
      className: cn(buttonVariants({ variant, size }), className),
      disabled: disabled || loading,
      'aria-busy': loading || undefined,
      ...props,
    };

    // Slot (asChild) requires exactly one child element to merge props onto
    // — even a `false` JSX expression counts as a second array item and
    // breaks it — so asChild renders the caller's element completely
    // unmodified rather than decorated with Button's own spinner markup.
    if (asChild) {
      return (
        <Slot ref={ref} {...sharedProps}>
          {children}
        </Slot>
      );
    }

    return (
      <button ref={ref} {...sharedProps}>
        {/* Decorative: aria-busy above plus the button's own visible text
            already convey the loading state, so a second "Loading"
            accessible name would just be noise. */}
        {/* The label stays in flow (invisible) so the button keeps its width while the spinner overlays it. */}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner size="sm" label="" />
          </span>
        )}
        <span className={cn('inline-flex items-center justify-center gap-2', loading && 'invisible')}>{children}</span>
      </button>
    );
  },
);
Button.displayName = 'Button';
