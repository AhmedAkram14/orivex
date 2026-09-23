/** Shared by device-sessions-list.tsx and login-history-table.tsx -- both render the same "City, Country" (or a fallback) shape next to a raw IP. */
export function formatLocation(
  city: string | undefined,
  country: string | undefined,
  unknownLabel: string,
): string {
  const parts = [city, country].filter((part): part is string => !!part && part.length > 0);
  return parts.length > 0 ? parts.join(', ') : unknownLabel;
}
