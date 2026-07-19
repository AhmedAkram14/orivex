import { Injectable } from '@nestjs/common';

import { ConsultationDomainError } from '../../domain/exceptions/consultation-domain.error.js';
import type {
  GenerateRoomTokenRequest,
  GenerateRoomTokenResult,
  RoomTokenGeneratorPort,
} from '../../application/ports/room-token-generator.port.js';

// Explicit stand-in for the "video-room token provider" (ConsultationModule
// dependency, ORIVEX Roadmap 2.0 Stage 2) -- bound whenever
// LIVEKIT_API_KEY/LIVEKIT_API_SECRET are unset (see consultation.module.ts).
// Performs no token logic and never fabricates a usable token; it fails
// loudly and explicitly the moment generateToken() is actually invoked, so
// ConsultationModule can stay fully wired into the running application
// without silently pretending video calls work. Mirrors
// NotConfiguredPaymentGatewayAdapter's exact idiom.
@Injectable()
export class NotConfiguredRoomTokenAdapter implements RoomTokenGeneratorPort {
  async generateToken(_request: GenerateRoomTokenRequest): Promise<GenerateRoomTokenResult> {
    throw new ConsultationDomainError(
      'RoomTokenGeneratorPort has no configured provider -- LIVEKIT_API_KEY/LIVEKIT_API_SECRET are unset. ' +
        'Video consultations cannot start until a real provider is chosen and bound.',
    );
  }
}
