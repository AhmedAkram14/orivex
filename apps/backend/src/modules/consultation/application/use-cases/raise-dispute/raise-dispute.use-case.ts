import { GetMediaAssetCommand } from '../../../../asset/application/use-cases/get-media-asset/get-media-asset.command.js';
import { GetMediaAssetUseCase } from '../../../../asset/application/use-cases/get-media-asset/get-media-asset.use-case.js';
import { MediaAssetPurpose } from '../../../../asset/domain/enums/media-asset-purpose.enum.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { Dispute } from '../../../domain/entities/dispute.entity.js';
import { AppointmentStatus } from '../../../domain/enums/appointment-status.enum.js';
import type { DisputeRepository } from '../../../domain/repositories/dispute.repository.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import { AppointmentPartyResolver } from '../../services/appointment-party-resolver.service.js';

import type { RaiseDisputeCommand } from './raise-dispute.command.js';

// I11 -- Admin dispute resolution (ORIVEX Remaining Work Audit): either
// genuine party on the appointment can raise a dispute -- same
// "verify caller is really the patient or doctor on this appointment, 404
// otherwise" pattern StartOrGetMessageThreadUseCase established for I7,
// now shared with DisputeController's by-id route via
// AppointmentPartyResolver (Dispute System Hardening Phase 1). One dispute
// per appointment (the schema's own unique index on appointmentId),
// enforced here too so the caller gets a real 409 instead of a raw
// constraint-violation 500.
export class RaiseDisputeUseCase {
  constructor(
    private readonly disputeRepository: DisputeRepository,
    private readonly appointmentRepository: AppointmentRepository,
    private readonly appointmentPartyResolver: AppointmentPartyResolver,
    private readonly getMediaAssetUseCase: GetMediaAssetUseCase,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: RaiseDisputeCommand): Promise<Dispute> {
    const appointment = await this.appointmentRepository.findById(command.appointmentId);
    if (!appointment) {
      throw new NotFoundError(`Appointment "${command.appointmentId}" not found.`);
    }

    const isParty = await this.appointmentPartyResolver.isAccountPartyToAppointment(appointment, command.callerAccountId);
    if (!isParty) {
      throw new NotFoundError(`Appointment "${command.appointmentId}" not found.`);
    }

    // Dispute System Hardening Phase 1: a stale-request/no-answer Expired
    // appointment was never actually attended by anyone -- there's no real
    // encounter left to dispute, matching the same stale-Expired-leak
    // hardening already applied to the booking/picker flows.
    if (appointment.getStatus() === AppointmentStatus.Expired) {
      throw new ConflictError('A dispute cannot be raised against an expired appointment.');
    }

    const existing = await this.disputeRepository.findByAppointmentId(command.appointmentId);
    if (existing) {
      throw new ConflictError('A dispute has already been raised for this appointment.');
    }

    if (command.attachmentAssetId) {
      const { asset } = await this.getMediaAssetUseCase.execute(
        new GetMediaAssetCommand({
          mediaAssetId: command.attachmentAssetId,
          callerAccountId: command.callerAccountId,
          callerIsAdmin: false,
        }),
      );
      if (asset.getPurpose() !== MediaAssetPurpose.DisputeAttachment) {
        throw new ValidationError('attachmentAssetId must reference a dispute attachment.', 'INVALID_ATTACHMENT_PURPOSE');
      }
    }

    const dispute = Dispute.raise({
      appointmentId: command.appointmentId,
      raisedByAccountId: command.callerAccountId,
      reason: command.reason,
      category: command.category,
      attachmentAssetId: command.attachmentAssetId,
    });
    await this.disputeRepository.save(dispute);
    await this.eventDispatcher.dispatch(dispute.releaseDomainEvents());
    return dispute;
  }
}
