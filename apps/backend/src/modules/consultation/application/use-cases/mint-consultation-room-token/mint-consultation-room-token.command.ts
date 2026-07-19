import type { RoomParticipantRole } from '../../ports/room-token-generator.port.js';

export interface MintConsultationRoomTokenCommandProps {
  consultationSessionId: string;
  identity: string;
  displayName: string;
  role: RoomParticipantRole;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style).
export class MintConsultationRoomTokenCommand {
  readonly consultationSessionId: string;
  readonly identity: string;
  readonly displayName: string;
  readonly role: RoomParticipantRole;

  constructor(props: MintConsultationRoomTokenCommandProps) {
    this.consultationSessionId = props.consultationSessionId;
    this.identity = props.identity;
    this.displayName = props.displayName;
    this.role = props.role;
  }
}
