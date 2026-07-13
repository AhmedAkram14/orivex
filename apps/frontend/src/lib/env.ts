// Single place reading process.env -- mirrors the backend's own
// fail-fast config philosophy (apps/backend/src/core/configuration/
// env.schema.ts): one validated read, not scattered process.env.X access
// throughout the codebase.
//
// NEXT_PUBLIC_ prefix is required for this to be readable in the browser
// (Next.js inlines NEXT_PUBLIC_* vars at build time) -- the API base URL
// is not a secret, it's called directly from client components too.
function getApiBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!value) {
    throw new Error(
      'NEXT_PUBLIC_API_BASE_URL is not set. Configure it in .env.local (dev) or the Vercel project' +
        ' environment variables (production) -- see .env.example.',
    );
  }
  return value.replace(/\/+$/, '');
}

export const env = {
  get apiBaseUrl(): string {
    return getApiBaseUrl();
  },
};
