import type { Appointment } from '../../../domain/entities/appointment.entity.js';
import { ListAppointmentsForDoctorUseCase } from '../list-appointments-for-doctor/list-appointments-for-doctor.use-case.js';

export interface GetAppointmentsForDoctorAndPatientQuery {
  doctorId: string;
  patientId: string;
}

// The single reusable "does this doctor have a real relationship with this
// patient" primitive -- factored out so DoctorPatientChartController
// (ClinicalModule) doesn't duplicate the same appointment query
// DoctorAppointmentsController.getDoctorPatients already performs. An empty
// result means no legitimate encounter ever existed between them; a
// non-empty result is both the authorization signal AND the exact
// doctor-owned appointment set every other doctor-scoped read (medical
// history, prescriptions) is built from.
export class GetAppointmentsForDoctorAndPatientUseCase {
  constructor(private readonly listAppointmentsForDoctorUseCase: ListAppointmentsForDoctorUseCase) {}

  async execute(query: GetAppointmentsForDoctorAndPatientQuery): Promise<Appointment[]> {
    const appointments = await this.listAppointmentsForDoctorUseCase.execute({ doctorId: query.doctorId });
    return appointments.filter((appointment) => appointment.getPatientId() === query.patientId);
  }
}
