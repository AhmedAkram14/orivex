/**
 * The `?returnTo=` a signed-out visitor carries to sign-in (from a deep link, a doctor card's Book, or
 * RequireAuth), accepted only as a same-site relative path -- never followed blindly (an
 * open-redirect guard, not just a UX nicety). Both the login form and the guest layout read it
 * through here, so whichever of them redirects first after sign-in sends the visitor to the same
 * place.
 */
export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  return value;
}
