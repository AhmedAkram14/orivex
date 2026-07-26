// Onboarding Redesign (2026-07-21 proposal, §6/Stage O.3): plain enum, not a
// reference table -- 8 fixed values, will never need runtime extension.
export enum BloodType {
  APositive = 'A+',
  ANegative = 'A-',
  BPositive = 'B+',
  BNegative = 'B-',
  ABPositive = 'AB+',
  ABNegative = 'AB-',
  OPositive = 'O+',
  ONegative = 'O-',
}
