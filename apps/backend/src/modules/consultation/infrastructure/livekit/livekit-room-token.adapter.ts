import { Injectable } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';

import type {
  GenerateRoomTokenRequest,
  GenerateRoomTokenResult,
  RoomTokenGeneratorPort,
} from '../../application/ports/room-token-generator.port.js';

// Real video-room token provider (ORIVEX Roadmap 2.0 implementation
// program, Stage 2). Bound in consultation.module.ts only when
// LIVEKIT_API_KEY/LIVEKIT_API_SECRET are set.
//
// Unlike StripePaymentGatewayAdapter, this never makes a network call --
// `AccessToken.toJwt()` mints a locally-signed JWT (HMAC over the grant
// claims), so there's no "injected client" to substitute in tests; the
// real adapter is exercised directly, asserting on the JWT it produces
// (matches this codebase's no-mocking-library convention: a real object,
// not a stub, is doing real work in tests).
@Injectable()
export class LiveKitRoomTokenAdapter implements RoomTokenGeneratorPort {
  constructor(
    private readonly apiKey: string,
    private readonly apiSecret: string,
    private readonly livekitUrl: string,
  ) {}

  async generateToken(request: GenerateRoomTokenRequest): Promise<GenerateRoomTokenResult> {
    const accessToken = new AccessToken(this.apiKey, this.apiSecret, {
      identity: request.identity,
      name: request.displayName,
    });
    accessToken.addGrant({
      room: request.roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      // Only the treating doctor may manage the room's own recording/
      // participant state; a patient can join/publish/subscribe but not
      // administer it.
      roomAdmin: request.role === 'doctor',
    });

    const token = await accessToken.toJwt();
    return { token, url: this.livekitUrl };
  }
}
