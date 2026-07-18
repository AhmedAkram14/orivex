export interface ListAppointmentsForDoctorQuery {
  doctorId: string;
  // When both are given, scopes to a [scheduledFrom, scheduledTo) window at
  // the database level instead of returning the doctor's entire appointment
  // history. Omit both for the unbounded "everything" query.
  scheduledFrom?: Date;
  scheduledTo?: Date;
}
