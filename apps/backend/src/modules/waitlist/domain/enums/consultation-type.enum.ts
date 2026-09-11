// WaitlistModule's own copy -- domain layers never import across module
// boundaries (same convention already applied by every other module that
// needs this identical enum, e.g. SchedulingModule's own copy).
export enum ConsultationType {
  Free = 'free',
  Paid = 'paid',
}
