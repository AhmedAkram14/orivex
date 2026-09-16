import { MessagingDomainError } from './messaging-domain.error.js';

// Messages Page Overhaul, Phase 1: thrown by MessageThreadRepository.save()
// when persisting a thread races against another writer for the same
// (patientId, doctorId) pair (Prisma P2002 on the compound unique
// constraint). The compound-keyed upsert already resolves this cleanly in
// the common case (an UPDATE instead of a conflicting INSERT), but a caller
// must still be able to recover from the rarer conflict this represents --
// see StartOrGetMessageThreadUseCase, which catches this and re-reads via
// findByPatientAndDoctor rather than assuming the upsert alone makes the
// race impossible.
export class MessageThreadConflictError extends MessagingDomainError {
  constructor(patientId: string, doctorId: string) {
    super(`A message thread for patient "${patientId}" and doctor "${doctorId}" was created concurrently.`);
    this.name = 'MessageThreadConflictError';
  }
}
