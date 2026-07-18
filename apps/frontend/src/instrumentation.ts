// Next.js instrumentation hook (runs once per runtime at server startup) --
// selects the matching Sentry config for whichever runtime this process
// actually is, per Sentry's documented App Router setup.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
