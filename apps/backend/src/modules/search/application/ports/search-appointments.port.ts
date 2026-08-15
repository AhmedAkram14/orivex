export interface AppointmentSearchRow {
  appointmentId: string;
  // The appointment's *counterpart* display name -- the other party's name
  // relative to the caller (the doctor's name when searching as a patient,
  // the patient's name when searching as a doctor), never the caller's own.
  counterpartName: string;
  scheduledAt: Date;
  status: string;
}

export interface AppointmentSearchResult {
  entries: AppointmentSearchRow[];
  total: number;
}

// SuperAdmin has no method here -- appointment search is intentionally
// omitted for that role (no existing admin appointment-management
// authorization to model scope on, per this phase's scope).
export interface SearchAppointmentsPort {
  searchForPatient(params: { patientProfileId: string; query: string; limit: number }): Promise<AppointmentSearchResult>;
  searchForDoctor(params: { doctorProfileId: string; query: string; limit: number }): Promise<AppointmentSearchResult>;
}
