import { Inject, Injectable } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import type { JwtSignerPort } from '../../modules/authentication/application/ports/jwt-signer.port.js';
import { JWT_SIGNER } from '../../modules/authentication/application/ports/tokens.js';
import { PinoLoggerService } from '../logging/pino-logger.service.js';

import type { RealtimeEmitterPort } from './ports/realtime-emitter.port.js';

// ORIVEX Roadmap 2.0 Stage 7 (real-time layer): a single gateway for every
// live push this app needs (new notification, doctor queue changed, patient
// appointment changed) rather than one gateway per concern -- there is only
// ever one recipient-addressing scheme (an account's own private room), so
// one namespace/room model covers every current and near-future use.
//
// Auth reuses AuthenticationModule's own JwtSignerPort (via
// AuthenticationGuardsModule, which has no business-logic dependencies --
// see that module's own comment on why it's safe to import from anywhere)
// rather than a parallel socket-specific auth scheme. `CORS_ORIGINS` is read
// directly from process.env because @WebSocketGateway's options are
// evaluated at class-decoration time, before Nest's DI container (and so
// ConfigService) exists -- matches main.ts's own `app.enableCors` origin
// list exactly.
@Injectable()
@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()),
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect, RealtimeEmitterPort {
  @WebSocketServer()
  private server!: Server;

  constructor(
    @Inject(JWT_SIGNER) private readonly jwtSigner: JwtSignerPort,
    private readonly logger: PinoLoggerService,
  ) {}

  // The frontend connects with `{ auth: { token: <access token> } }` (the
  // same in-memory access token every REST call already sends as a bearer
  // header) -- an unauthenticated or invalid token disconnects immediately,
  // never joins a room, and is never a source of live data for anyone.
  async handleConnection(socket: Socket): Promise<void> {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      socket.disconnect(true);
      return;
    }

    try {
      const claims = await this.jwtSigner.verify(token);
      // Messages Page Overhaul (Phase 2): stashed on the socket itself so
      // the inbound `messaging.typing` handler below always has this
      // socket's own authenticated identity to hand -- never trusting
      // whatever a client claims about itself in a message payload.
      socket.data.accountId = claims.accountId;
      await socket.join(accountRoom(claims.accountId));
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(): void {
    // Nothing to clean up -- socket.io removes the disconnected socket from
    // every room it joined automatically.
  }

  // Typing indicator (Messages Page Overhaul, Phase 2): ephemeral, never
  // persisted -- pre-approved in docs/06-system-architecture.md §6 ("Simple
  // ephemeral pub/sub signal, not persisted"). `fromAccountId` is always
  // this socket's OWN authenticated accountId (set in handleConnection
  // above), never taken from the inbound payload -- a socket cannot claim
  // to be typing as anyone else. Silently drops a malformed/pre-auth
  // payload rather than throwing, matching emitToAccount's own
  // fail-quiet-not-fail-loud posture for a low-stakes realtime signal.
  @SubscribeMessage('messaging.typing')
  handleTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { threadId?: string; recipientAccountId?: string },
  ): void {
    const fromAccountId = socket.data?.accountId as string | undefined;
    if (!fromAccountId || !body?.threadId || !body?.recipientAccountId) {
      return;
    }
    this.emitToAccount(body.recipientAccountId, 'messaging.typing', { threadId: body.threadId, fromAccountId });
  }

  // Never called before the app has an initialized Nest module graph
  // (every producer is itself a NestJS provider), so `this.server` is
  // always assigned by the time this runs.
  emitToAccount(accountId: string, event: string, payload: unknown): void {
    if (!this.server) {
      // Genuinely unreachable in production boot order, but a live push
      // failing silently is far better than it crashing the caller (a
      // notification handler, an appointment use case) -- same tolerance
      // every notification handler already applies to its own failures.
      this.logger.error('RealtimeGateway.emitToAccount called before the socket server was initialized', undefined, {
        accountId,
        event,
      });
      return;
    }
    this.server.to(accountRoom(accountId)).emit(event, payload);
  }
}

function accountRoom(accountId: string): string {
  return `account:${accountId}`;
}
