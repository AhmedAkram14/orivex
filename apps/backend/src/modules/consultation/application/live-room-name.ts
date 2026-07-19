// The one place both the room-token minting use-case and the LiveKit
// webhook receiver derive a LiveKit room name from -- keeping the
// convention in a single function on each direction avoids the two ever
// drifting out of sync.
const ROOM_NAME_PREFIX = 'consultation-';

export function buildRoomName(consultationSessionId: string): string {
  return `${ROOM_NAME_PREFIX}${consultationSessionId}`;
}

// Returns null for any room name this application didn't itself mint
// (e.g. a stray webhook event from an unrelated room) -- the webhook
// receiver treats that as a silent no-op, never a hard failure.
export function parseConsultationSessionId(roomName: string): string | null {
  return roomName.startsWith(ROOM_NAME_PREFIX) ? roomName.slice(ROOM_NAME_PREFIX.length) : null;
}
