import { DoctorDomainError } from './doctor-domain.error.js';

/** The applicant's date of birth puts them outside a practising doctor's age range. */
export class DoctorAgeOutOfRangeError extends DoctorDomainError {}

/** A license expiry date before today: an expired license can't be submitted. */
export class LicenseExpiredError extends DoctorDomainError {}
