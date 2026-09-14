// K10 -- Wearables integration boundary. Lowercase-hyphen values, matching
// this codebase's domain-enum convention (see vital-type.enum.ts).
export enum VitalReadingSource {
  Clinical = 'clinical',
  PatientReported = 'patient-reported',
  Device = 'device',
}
