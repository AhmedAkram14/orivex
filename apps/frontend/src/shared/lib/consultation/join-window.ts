// Join-Window Enforcement feature: neither the doctor nor the patient may
// join a consultation's video room starting more than this long before the
// appointment's scheduledAt, nor after this long past it -- past the close,
// the appointment is (or is about to be) reconciled No-show by the
// backend's own sweep. Matches MintConsultationRoomTokenUseCase's own
// window exactly (apps/backend/.../mint-consultation-room-token.use-case.ts)
// so a disabled/hidden Join button here always agrees with what the real
// API would actually accept. Real elapsed-time arithmetic on real UTC
// instants -- deliberately NOT `getCairoNow()`, which shifts a Date for
// *display* getters and would corrupt this math.
export const JOIN_WINDOW_OPENS_BEFORE_MS = 30 * 60_000;
export const JOIN_WINDOW_CLOSES_AFTER_MS = 30 * 60_000;

export function canJoinCall(scheduledAt: string, now: Date = new Date()): boolean {
  const scheduled = new Date(scheduledAt).getTime();
  return now.getTime() >= scheduled - JOIN_WINDOW_OPENS_BEFORE_MS && now.getTime() <= scheduled + JOIN_WINDOW_CLOSES_AFTER_MS;
}

/** The real UTC instant (epoch ms) at which the join window opens for this appointment. */
export function getJoinWindowOpensAtMs(scheduledAt: string): number {
  return new Date(scheduledAt).getTime() - JOIN_WINDOW_OPENS_BEFORE_MS;
}
