// The Patient Portal's medical records timeline (GET /patients/me/medical-records)
// -- composed from two different source entities (ClinicalNote and
// HealthGraphNode), never a single aggregate, so this uses a `create()`
// factory rather than a `fromDomain()` mapper tied to one entity. `type` is
// deliberately only 'visit' | 'condition' -- the domain's
// HealthGraphNodeType has no "diagnosis" or "allergy" concept distinct from
// `condition`, so no such categories are fabricated here.
export class MedicalRecordEntryResponseDto {
  id!: string;
  type!: 'visit' | 'condition';
  date!: string;
  title!: string;
  description!: string | undefined;
  doctorName!: string | undefined;
  downloadUrl!: string | undefined;

  static create(props: {
    id: string;
    type: 'visit' | 'condition';
    date: string;
    title: string;
    description: string | undefined;
    doctorName: string | undefined;
    downloadUrl: string | undefined;
  }): MedicalRecordEntryResponseDto {
    const dto = new MedicalRecordEntryResponseDto();
    dto.id = props.id;
    dto.type = props.type;
    dto.date = props.date;
    dto.title = props.title;
    dto.description = props.description;
    dto.doctorName = props.doctorName;
    dto.downloadUrl = props.downloadUrl;
    return dto;
  }
}
