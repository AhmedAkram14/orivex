// Onboarding Redesign (2026-07-21 proposal, Stage O.5): a side-effect-free
// existence check backing the "Choose Your Journey" gate. Deliberately
// separate from GET /patients/me, which lazily creates a bare PatientProfile
// on first read (docs/10-backend-architecture.md's documented
// AccountCreated-subscriber end state, achieved lazily) -- checking "should I
// show Choose Your Journey" must never itself trigger that creation, or the
// gate would permanently suppress itself the moment it's evaluated.
export class PatientProfileExistsResponseDto {
  exists!: boolean;

  static fromResult(exists: boolean): PatientProfileExistsResponseDto {
    const dto = new PatientProfileExistsResponseDto();
    dto.exists = exists;
    return dto;
  }
}
