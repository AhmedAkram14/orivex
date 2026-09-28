// Patient-Reported Allergy Status (2026-09-28): a patient's own answer,
// tracked separately from a doctor's `allergiesConfirmedNoneAt` attestation --
// the two never satisfy each other (see PatientProfile.update()'s guard and
// the doctor chart's three-state banner). Plain string enum, same convention
// as BloodType (persisted as a raw string column, not a Prisma-native enum).
export enum PatientAllergyStatus {
  /** Never answered -- the default for every existing and new profile. */
  Unknown = 'unknown',
  /** The patient said they have none; not a clinical confirmation. */
  NoneReported = 'none_reported',
  /** Derived automatically whenever `allergies` holds real text -- never set directly by a client. */
  HasAllergies = 'has_allergies',
}
