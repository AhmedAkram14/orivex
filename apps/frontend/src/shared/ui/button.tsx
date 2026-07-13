import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { Spinner } from '@/shared/ui/spinner';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-(--duration-fast) ease-(--ease-standard) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-(--opacity-disabled)',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
        outline: 'border border-border-strong bg-transparent text-text-primary hover:bg-secondary-subtle',
        ghost: 'bg-transparent text-text-primary hover:bg-secondary-subtle',
        danger: 'bg-danger text-danger-foreground hover:bg-danger/90',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'size-10',
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
        {loading && <Spinner size="sm" label="" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
