import type { ConsentState } from '../../domain/enums/consent-state.enum.js';

// The patient-facing "Data sharing" list -- one row per doctor the patient
// has ever had a real appointment with, plus that doctor's current
// (possibly default) consent state. An additive UI-composition view, not a
// replacement for GET /patients/{id}/consents (docs/12-openapi.md's
// documented, versioned consent history) -- this is "who can currently see
// my record," that is "what changed and when."
export class SharedDoctorResponseDto {
  doctorId!: string;
  doctorName!: string;
  specialization!: string;
  specializationAr!: string | null;
  consentState!: ConsentState;

  static create(props: {
    doctorId: string;
    doctorName: string;
    specialization: string;
    specializationAr: string | null;
    consentState: ConsentState;
  }): SharedDoctorResponseDto {
    const dto = new SharedDoctorResponseDto();
    dto.doctorId = props.doctorId;
    dto.doctorName = props.doctorName;
    dto.specialization = props.specialization;
    dto.specializationAr = props.specializationAr;
    dto.consentState = props.consentState;
    return dto;
  }
}
