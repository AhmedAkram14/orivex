export type WaitlistEntryStatus = 'waiting' | 'notified' | 'fulfilled' | 'cancelled';
export type WaitlistConsultationType = 'free' | 'paid';

/** Matches WaitlistEntryResponseDto exactly (WaitlistController). */
export interface WaitlistEntry {
  id: string;
  doctorId: string;
  consultationType: WaitlistConsultationType | null;
  /** ISO timestamp. */
  earliestAcceptableAt: string;
  /** ISO timestamp. */
  latestAcceptableAt: string;
  status: WaitlistEntryStatus;
  notifiedAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface JoinWaitlistParams {
  doctorId: string;
  consultationType?: WaitlistConsultationType;
  /** ISO timestamp. */
  earliestAcceptableAt: string;
  /** ISO timestamp. */
  latestAcceptableAt: string;
}
