// Matches docs/12-openapi.md's HealthGraphNode.nodeType enum exactly.
export enum HealthGraphNodeType {
  Condition = 'condition',
  Symptom = 'symptom',
  Medication = 'medication',
  LabResult = 'lab_result',
  RadiologyResult = 'radiology_result',
}
