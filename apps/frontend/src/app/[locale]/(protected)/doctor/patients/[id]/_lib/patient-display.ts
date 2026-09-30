const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A human-shaped stand-in for the real UUID (never truncated/altered anywhere it's actually used for a lookup --
 * display only). Matches the short-SHA convention: its first 8 hex characters, uppercased. `null` when the id is
 * not a UUID (a demo slug like "patient-p..."), so the caller omits the line instead of showing a truncated slug.
 */
export function shortId(id: string): string | null {
  return UUID.test(id) ? id.slice(0, 8).toUpperCase() : null;
}

export function ageFrom(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}
