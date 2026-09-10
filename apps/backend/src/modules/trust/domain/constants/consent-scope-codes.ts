// Exported so every consumer (ClinicalModule's read paths, this module's
// own ConsentController) references the same constant rather than each
// hardcoding the string.
export const GENERAL_CONSENT_SCOPE_CODE = 'general';

// I6 -- Health Passport (docs/01.1-prd-update.md §33-34): the one scope
// this codebase treats as default-REVOKED rather than default-GRANTED
// (GetConsentStateUseCase's own `defaultState` parameter) -- a treating
// doctor sees a patient's mental-health notes only after an explicit grant,
// the opposite of every other clinical scope. Seeded in this feature's own
// migration (schema.prisma's ConsentScopeCategory comment: "adding that
// category is a one-row follow-up once I6 ships").
export const MENTAL_HEALTH_CONSENT_SCOPE_CODE = 'mental_health';
