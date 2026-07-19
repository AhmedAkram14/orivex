import { Controller, Headers, HttpCode, HttpStatus, Post, Req, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { WebhookReceiver, type WebhookEvent } from 'livekit-server-sdk';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';
import { ValidationError } from '../../../../shared/errors/app-error.js';
import { parseConsultationSessionId } from '../../application/live-room-name.js';
import { RecordSessionConnectionLogCommand } from '../../application/use-cases/record-session-connection-log/record-session-connection-log.command.js';
import { RecordSessionConnectionLogUseCase } from '../../application/use-cases/record-session-connection-log/record-session-connection-log.use-case.js';

// Deliberately its own controller, no JwtAuthGuard/RolesGuard -- LiveKit is
// not an authenticated user of this API, and cannot present a Bearer
// token. Trust here comes entirely from verifying the request was signed
// by LiveKit's own webhook JWT (WebhookReceiver.receive()), computed over
// the exact raw byte payload (main.ts's `rawBody: true`), mirroring
// payment-webhook.controller.ts's exact idiom for Stripe.
@Controller('telemedicine/webhook')
@SkipThrottle()
export class TelemedicineWebhookController {
  constructor(
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly recordSessionConnectionLogUseCase: RecordSessionConnectionLogUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Req() request: RawBodyRequest<Request>,
    @Headers('authorization') authHeader?: string,
  ): Promise<{ received: true }> {
    const apiKey = this.configService.get('LIVEKIT_API_KEY', { infer: true });
    const apiSecret = this.configService.get('LIVEKIT_API_SECRET', { infer: true });
    if (!apiKey || !apiSecret) {
      throw new ServiceUnavailableException('LiveKit is not configured; webhook events cannot be verified.');
    }
    if (!authHeader || !request.rawBody) {
      throw new ValidationError('Missing LiveKit authorization header or raw request body.');
    }

    const receiver = new WebhookReceiver(apiKey, apiSecret);
    let event: WebhookEvent;
    try {
      event = await receiver.receive(request.rawBody.toString('utf8'), authHeader);
    } catch {
      throw new ValidationError('Invalid LiveKit webhook signature.');
    }

    const note = toConnectionLogNote(event);
    const roomName = event.room?.name;
    if (note && roomName) {
      const consultationSessionId = parseConsultationSessionId(roomName);
      if (consultationSessionId) {
        await this.recordSessionConnectionLogUseCase.execute(
          new RecordSessionConnectionLogCommand({ consultationSessionId, note }),
        );
      }
    }

    return { received: true };
  }
}

// Only the 3 connection-quality events this stage cares about
// (docs/06-system-architecture.md's ConsultationSession.addConnectionLog
// "technical quality records") produce a log entry -- every other LiveKit
// event (room_started, egress_*, ingress_*, etc.) is a deliberate no-op,
// not a gap.
function toConnectionLogNote(event: WebhookEvent): string | null {
  const identity = event.participant?.identity ?? 'unknown-participant';
  switch (event.event) {
    case 'participant_joined':
      return `participant_joined: ${identity}`;
    case 'participant_left':
      return `participant_left: ${identity}`;
    case 'track_published':
      return `track_published: ${identity} (${event.track?.type ?? 'unknown-track'})`;
    default:
      return null;
  }
}
