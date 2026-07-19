export type RoomParticipantRole = 'doctor' | 'patient';

export interface GenerateRoomTokenRequest {
  roomName: string;
  // The participant's own account id -- unique per caller, matches
  // Section 11's "identity" concept for the video-room grant. Never a raw
  // display name alone, since two patients could otherwise collide.
  identity: string;
  displayName: string;
  role: RoomParticipantRole;
}

export interface GenerateRoomTokenResult {
  token: string;
  // The ws://+wss:// URL the frontend's LiveKit client connects to
  // directly (LIVEKIT_URL) -- returned alongside the token so the
  // frontend never needs its own copy of that config.
  url: string;
}

// Port only (docs/06-system-architecture.md Section 11: "every external
// dependency is accessed through a dedicated adapter... implementing a
// stable internal interface"), matching PaymentGatewayPort's shape
// exactly (apps/backend/src/modules/payment/application/ports/
// payment-gateway.port.ts).
//
// LiveKit is the bound adapter as of the ORIVEX Roadmap 2.0 implementation
// program's Stage 2 -- ConsultationModule falls back to
// NotConfiguredRoomTokenAdapter whenever LIVEKIT_API_KEY/LIVEKIT_API_SECRET
// are unset, so the app keeps booting cleanly with zero video-room
// credentials configured, exactly as PaymentModule already does for Stripe.
export interface RoomTokenGeneratorPort {
  generateToken(request: GenerateRoomTokenRequest): Promise<GenerateRoomTokenResult>;
}
