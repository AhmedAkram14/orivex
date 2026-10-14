import { ageInYears, cairoToday, calendarDay } from '../../../../shared/date/calendar-date.js';
import { DoctorAgeOutOfRangeError, LicenseExpiredError } from '../exceptions/doctor-eligibility.error.js';

/** A practising doctor's age, inclusive: 22 (the earliest a medical graduate is licensed) to 90. */
export const DOCTOR_MIN_AGE = 22;
export const DOCTOR_MAX_AGE = 90;

/**
 * Applying as a doctor: a date of birth on record must give an age from 22 to 90 today (Cairo). No date of
 * birth is left to the personal-info step, which collects it before the application.
 */
export function assertPractisingAge(dateOfBirth: Date | undefined, now: Date = new Date()): void {
  if (!dateOfBirth) return;
  const age = ageInYears(calendarDay(dateOfBirth), cairoToday(now));
  if (age < DOCTOR_MIN_AGE || age > DOCTOR_MAX_AGE) {
    throw new DoctorAgeOutOfRangeError(
      `A doctor's age must be between ${DOCTOR_MIN_AGE} and ${DOCTOR_MAX_AGE}; the date of birth on record gives ${age}.`,
    );
  }
}

/** A license expiry date must be today or later (Cairo): an expired license isn't accepted. */
export function assertLicenseNotExpired(licenseExpiryDate: Date | undefined, now: Date = new Date()): void {
  if (!licenseExpiryDate) return;
  if (calendarDay(licenseExpiryDate) < cairoToday(now)) {
    throw new LicenseExpiredError('The license expiry date is in the past: an expired license cannot be submitted.');
  }
}
