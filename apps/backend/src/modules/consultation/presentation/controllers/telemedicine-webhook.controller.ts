import { Controller, Headers, HttpCode, HttpStatus, Post, Req, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { WebhookReceiver, type WebhookEvent } from 'livekit-server-sdk';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';
import { ValidationError } from '../../../../shared/errors/app-error.js';
import { parseConsultationSessionId } from '../../application/live-room-name.js';
import { CloseConsultationCommand } from '../../application/use-cases/close-consultation/close-consultation.command.js';
import { CloseConsultationUseCase } from '../../application/use-cases/close-consultation/close-consultation.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { RecordSessionConnectionLogCommand } from '../../application/use-cases/record-session-connection-log/record-session-connection-log.command.js';
import { RecordSessionConnectionLogUseCase } from '../../application/use-cases/record-session-connection-log/record-session-connection-log.use-case.js';
import { ConsultationCompletionReason } from '../../domain/enums/consultation-completion-reason.enum.js';
import { ConsultationState } from '../../domain/enums/consultation-state.enum.js';

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
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly closeConsultationUseCase: CloseConsultationUseCase,
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

    const roomName = event.room?.name;
    const consultationSessionId = roomName ? parseConsultationSessionId(roomName) : null;

    const note = toConnectionLogNote(event);
    if (note && consultationSessionId) {
      await this.recordSessionConnectionLogUseCase.execute(
        new RecordSessionConnectionLogCommand({ consultationSessionId, note }),
      );
    }

    if (event.event === 'room_finished' && consultationSessionId) {
      await this.handleRoomFinished(consultationSessionId);
    }

    return { received: true };
  }

  // Consultation Lifecycle Completion: the real-time half of auto-closing a
  // session (the other half is the periodic stale-session sweep --
  // stale-consultation-session-reconciliation.service.ts -- for when this
  // event never arrives). Idempotent and tolerant by design, matching this
  // controller's existing connection-log handling: an already-Closed
  // session (the doctor beat this webhook to it, or a duplicate delivery)
  // is silently ignored, never surfaced as a webhook failure to LiveKit.
  private async handleRoomFinished(consultationSessionId: string): Promise<void> {
    const session = await this.getConsultationSessionByIdUseCase.execute({ consultationSessionId });
    if (!session || session.getState() === ConsultationState.Closed) {
      return;
    }

    const completionReason =
      session.getState() === ConsultationState.InProgress
        ? ConsultationCompletionReason.Completed
        : ConsultationCompletionReason.InterruptedTechnical;

    try {
      await this.closeConsultationUseCase.execute(new CloseConsultationCommand({ consultationSessionId, completionReason }));
    } catch {
      // Raced with something else closing this same session between the
      // read above and this call -- already handled, nothing more to do.
    }
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
