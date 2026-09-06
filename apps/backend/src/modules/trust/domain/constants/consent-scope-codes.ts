// The one scope category this pass has an actual consumer for -- see
// schema.prisma's ConsentScopeCategory comment for why "mental_health" is
// not defined here yet. Exported so every consumer (ClinicalModule's read
// paths, this module's own ConsentController) references the same
// constant rather than each hardcoding the string 'general'.
export const GENERAL_CONSENT_SCOPE_CODE = 'general';
