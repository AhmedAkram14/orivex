/**
 * Analytics vendor is genuinely undecided (Section 1.2 of the frontend
 * roadmap) — this is the call-site contract every feature should use from
 * day one, so wiring a real provider later (Phase 30) is a change to this
 * one file, not a find-and-replace across every feature. Today it only
 * logs in development and is a no-op in production, rather than silently
 * sending events nowhere or to a vendor nobody chose.
 */
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
}

export function trackEvent(event: AnalyticsEvent): void {
  if (process.env.NODE_ENV === 'development') {
    // console is the only sink until a real analytics provider is chosen.
    console.info('[analytics]', event.name, event.properties ?? {});
  }
}
