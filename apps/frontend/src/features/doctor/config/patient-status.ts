/**
 * PRODUCT DECISION -- needs clinical sign-off before it is treated as final.
 *
 * How long after their last completed visit a patient still counts as "Active" on the doctor's
 * Patients list (with nothing booked). After this they read "Inactive". 90 days is a placeholder,
 * not a clinical rule: psychiatry maintenance follow-ups, for example, often run longer than
 * three months, so someone on the clinical side should confirm the number -- and whether it should
 * differ by specialty -- and change it here. Every use (status chip, status filter, the "Active
 * patients" count) reads this one value.
 */
export const PATIENT_ACTIVE_WINDOW_DAYS = 90;
