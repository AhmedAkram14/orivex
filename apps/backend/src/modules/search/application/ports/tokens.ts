// NestJS DI injection tokens for this module's own read-only query ports.
// SearchModule owns no aggregates and no write-repos -- same CQRS
// read-model shape as ReportingModule's tokens.ts, one token per concern.
export const SEARCH_DOCTORS_QUERY = Symbol('SearchDoctorsPort');
export const SEARCH_PATIENTS_QUERY = Symbol('SearchPatientsPort');
export const SEARCH_APPOINTMENTS_QUERY = Symbol('SearchAppointmentsPort');
