'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { env } from '@/shared/lib/env';
import type { SubmitVerificationRequest, VerificationCase } from '@/features/doctor/api/types';

// Onboarding Redesign (2026-07-21 proposal, Stage O.7): a narrow,
// mocks-only test seam so Playwright (which drives the app through a real
// browser, unlike Vitest's component tests, and so cannot `import()` the
// store directly) can simulate "patient submitted, then was approved" for
// the gated-action -> gate -> verify -> approve -> return E2E flow, without
// a real AdministrationModule review screen for patients existing yet.
// Only ever attached when NEXT_PUBLIC_ENABLE_API_MOCKS=true (the e2e/dev
// mock build), so this never exists in a production bundle.
declare global {
  interface Window {
    __mockPatientVerification?: {
      setPatientVerified: (verified: boolean) => void;
      approveMyLatestVerification: () => void;
      suspendMyLatestVerification: (reason: string) => void;
    };
    // Onboarding Redesign integration-gap closure (2026-07-25): lets an E2E
    // spec guarantee a bookable slot exists "today" (via an `extra-hours`
    // exception) regardless of which real weekday the suite happens to run
    // on, without faking the browser's system clock.
    __mockScheduling?: {
      addDoctorException: (exception: {
        date: string;
        type: 'vacation' | 'unavailable' | 'extra-hours';
        hours?: { start: string; end: string };
        reason?: string;
      }) => void;
    };
    // Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8):
    // lets an admin-focused E2E spec seed "a doctor already submitted their
    // professional verification" precondition without re-driving the full
    // Doctor Onboarding wizard in the same spec (already covered end-to-end
    // by `onboarding-flow.test.tsx`/its own E2E coverage) -- the admin
    // review flow itself (queue, case detail, documents, decide/suspend) is
    // then driven through 100% real clicks against the real admin UI.
    __mockDoctorStore?: {
      submitVerification: (doctorId: string, request: SubmitVerificationRequest) => VerificationCase;
      seedInConsultationQueueEntry: (consultationSessionId: string, label: string) => void;
    };
    // Consultation-completion follow-up (2026-07-26): lets an E2E spec place
    // a real ConsultationSession "in progress" on the doctor's queue and a
    // matching Completed appointment on the patient's list, so the spec can
    // drive the real Complete-Consultation -> post-consultation summary ->
    // rate -> doctor-aggregate-changes chain through 100% real clicks,
    // without a real LiveKit connection to join/disconnect/reconnect
    // against (this environment has no real LiveKit server -- see this
    // file's own top-level doc comment on why MSW replaces the backend, not
    // LiveKit specifically, which no mock can meaningfully stand in for in a
    // real browser). This is the one disclosed simplification in that
    // chain, mirroring `__mockDoctorStore`'s own precedent.
    __mockPatientAppointments?: {
      seedCompletedAppointment: (consultationSessionId: string, doctor: { name: string; specialty: string }) => void;
    };
  }
}

/**
 * Starts the MSW browser worker only when explicitly opted into via
 * NEXT_PUBLIC_ENABLE_API_MOCKS=true (never by default — a real backend
 * call silently turning into a mock is worse than a mock that never
 * activates). Renders nothing until the worker is ready in that case, so a
 * real request can't slip through before interception starts; renders
 * children immediately otherwise, so this is a no-op cost-wise in every
 * environment that hasn't opted in.
 */
export function MockProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!env.enableApiMocks);
  const [startupError, setStartupError] = useState<Error | null>(null);

  useEffect(() => {
    if (!env.enableApiMocks) return;
    Promise.all([
      import('@/mocks/browser'),
      import('@/mocks/patient-store'),
      import('@/mocks/scheduling-store'),
      import('@/mocks/doctor-store'),
    ])
      .then(
        ([
          { worker },
          { setPatientVerified, approveMyLatestVerification, suspendMyLatestVerification, seedCompletedAppointment },
          { addDoctorException },
          { submitVerification, seedInConsultationQueueEntry },
        ]) => {
          window.__mockPatientVerification = { setPatientVerified, approveMyLatestVerification, suspendMyLatestVerification };
          window.__mockScheduling = { addDoctorException };
          window.__mockDoctorStore = { submitVerification, seedInConsultationQueueEntry };
          window.__mockPatientAppointments = { seedCompletedAppointment };
          return worker.start({ onUnhandledRequest: 'bypass' });
        },
      )
      .then(() => setReady(true))
      // MSW Authentication Boundary Fix: a demo build must never silently
      // fall through to real requests just because the worker failed to
      // register (e.g. the service worker script 404s, or the browser
      // blocks SW registration entirely) -- that's exactly the "looks like
      // it's mocked but secretly isn't" failure mode this whole fix exists
      // to close. Surfacing the error and refusing to render is the
      // opposite of silent: nothing (real or mocked) can accidentally run
      // against production while `NEXT_PUBLIC_ENABLE_API_MOCKS=true`.
      .catch((error: unknown) => {
        // The one diagnostic surface a developer has for a mock-startup failure.
        console.error('[MockProvider] Failed to start the MSW mock worker.', error);
        setStartupError(error instanceof Error ? error : new Error(String(error)));
      });
  }, []);

  if (startupError) {
    return (
      <div style={{ padding: 24, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
        <h1>Demo mode failed to initialize</h1>
        <p>
          NEXT_PUBLIC_ENABLE_API_MOCKS is true, but the MSW mock worker could not start. Refusing to render rather than
          risk any request silently reaching the real backend.
        </p>
        <pre>{startupError.message}</pre>
      </div>
    );
  }

  if (!ready) return null;
  return children;
}
