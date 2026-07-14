'use client';

import { Toast, ToastClose, ToastDescription, ToastTitle, ToastViewport } from '@/shared/ui/toast';
import { dismissToast, useToast } from '@/shared/ui/use-toast';

/** Renders every currently-active toast from the shared imperative store. Mounted once, in AppProviders. */
export function Toaster() {
  const { toasts } = useToast();

  return (
    <>
      {toasts.map(({ id, title, description, variant }) => (
        <Toast key={id} variant={variant} open onOpenChange={(open) => !open && dismissToast(id)}>
          <div className="flex flex-col gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </>
  );
}
