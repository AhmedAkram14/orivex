import { ConsultationState } from '../../domain/enums/consultation-state.enum.js';
import type { QueueEntryStatus } from '../dto/queue-entry-response.dto.js';

// WaitingRoom/InProgress/Closed are the only states this codebase's current
// use cases ever actually set (ConsultationSession.open()/start()/close()) --
// Completed/Interrupted/EmergencyEscalation are declared on the domain enum
// for future workflows but never reached today, so they fall back to
// 'completed' (a closed session, whatever the reason) rather than throwing
// on a value that can't occur yet.
export function toQueueStatus(state: ConsultationState): QueueEntryStatus {
  switch (state) {
    case ConsultationState.WaitingRoom:
      return 'waiting';
    case ConsultationState.InProgress:
      return 'in-consultation';
    default:
      return 'completed';
  }
}
