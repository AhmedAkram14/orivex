/**
 * Demo Data & Profile Avatar Pass.
 *
 * Every mock store below is now genuinely account-keyed (a `Map` from the
 * logged-in account id to that account's own data) rather than a single
 * shared singleton -- that fix is unconditional and applies everywhere.
 *
 * The *volume* of seeded demo content (20 doctors + 20 patients and all
 * their appointments/ratings/notifications/verification cases) is a
 * different question. Those records land in genuinely global, non-account-
 * keyed surfaces too -- the doctor directory, the admin verification queue,
 * the public landing page's specialty counts -- where the existing frontend
 * test suite asserts today's small, deterministic fixture reality ("nothing
 * pending review", "one seeded doctor"). Flooding those surfaces would make
 * dozens of otherwise-correct tests fail for reasons that have nothing to do
 * with what they're testing.
 *
 * So the demo dataset is seeded everywhere the app actually runs (the real
 * browser demo, `NEXT_PUBLIC_ENABLE_API_MOCKS=true`) and skipped under
 * Vitest, where each store falls back to exactly the legacy fixture it
 * already had. Both paths run the same account-keyed code; only the seed
 * volume differs.
 */
export const DEMO_SEED_ENABLED = process.env.NODE_ENV !== 'test';
