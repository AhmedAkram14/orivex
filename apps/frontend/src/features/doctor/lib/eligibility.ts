/**
 * A practising doctor's age, inclusive -- the same range the API enforces when an application is submitted
 * (DoctorModule's doctor-eligibility.ts): 22, the earliest a medical graduate is licensed, to 90.
 */
export const DOCTOR_AGE_RANGE = { min: 22, max: 90 } as const;
