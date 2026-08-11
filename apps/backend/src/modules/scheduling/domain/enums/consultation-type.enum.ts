// SchedulingModule's own copy -- domain layers never import across module
// boundaries (same convention already applied by DoctorModule/
// ConsultationModule to this identical enum). Needed here so
// WorkingHoursDay (this module's own aggregate) can own a default
// ConsultationPricing without reaching into another module's domain layer.
export enum ConsultationType {
  Free = 'free',
  Paid = 'paid',
}
