import type { GenerateRoomTokenResult } from '../../application/ports/room-token-generator.port.js';

// ORIVEX Roadmap 2.0 Stage 2 -- Telemedicine. Matches
// GenerateRoomTokenResult's shape exactly: the frontend's LiveKit client
// needs both the token and the server URL to connect, and never needs its
// own copy of LIVEKIT_URL config.
export class RoomTokenResponseDto {
  token!: string;
  url!: string;

  static fromResult(result: GenerateRoomTokenResult): RoomTokenResponseDto {
    const dto = new RoomTokenResponseDto();
    dto.token = result.token;
    dto.url = result.url;
    return dto;
  }
}
