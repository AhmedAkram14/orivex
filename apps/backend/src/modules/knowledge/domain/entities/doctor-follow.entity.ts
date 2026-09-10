import { randomUUID } from 'node:crypto';

export interface FollowDoctorProps {
  patientId: string;
  doctorId: string;
}

export interface ReconstituteDoctorFollowProps {
  id: string;
  patientId: string;
  doctorId: string;
  createdAt: Date;
}

// I13 -- Knowledge Center. A content-subscription signal only -- explicitly
// NOT an implicit clinical relationship or messaging channel (docs/01.1-
// prd-update.md §6's own business rule). Fully immutable; "unfollowing" is
// deleting the row, not a state transition on this entity.
export class DoctorFollow {
  private constructor(
    private readonly id: string,
    private readonly patientId: string,
    private readonly doctorId: string,
    private readonly createdAt: Date,
  ) {}

  static follow(props: FollowDoctorProps): DoctorFollow {
    return new DoctorFollow(randomUUID(), props.patientId, props.doctorId, new Date());
  }

  static reconstitute(props: ReconstituteDoctorFollowProps): DoctorFollow {
    return new DoctorFollow(props.id, props.patientId, props.doctorId, props.createdAt);
  }

  getId(): string {
    return this.id;
  }

  getPatientId(): string {
    return this.patientId;
  }

  getDoctorId(): string {
    return this.doctorId;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
