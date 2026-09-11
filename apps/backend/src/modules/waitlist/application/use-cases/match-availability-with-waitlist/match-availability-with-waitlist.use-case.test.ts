import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DomainEvent } from '../../../../../shared/domain/domain-event.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { GetAvailabilityWindowByIdUseCase } from '../../../../doctor/application/use-cases/get-availability-window-by-id/get-availability-window-by-id.use-case.js';
import { AvailabilityWindow } from '../../../../doctor/domain/entities/availability-window.entity.js';
import { AvailabilityWindowStatus } from '../../../../doctor/domain/enums/availability-window-status.enum.js';
import type { AvailabilityWindowRepository } from '../../../../doctor/domain/repositories/availability-window.repository.js';
import { ConsultationPricing } from '../../../../doctor/domain/value-objects/consultation-pricing.value-object.js';
import { WaitlistOpportunityMatchedEvent } from '../../../domain/events/waitlist-opportunity-matched.event.js';
import { WaitlistEntry } from '../../../domain/entities/waitlist-entry.entity.js';
import type { WaitlistEntryRepository } from '../../../domain/repositories/waitlist-entry.repository.js';

import { MatchAvailabilityWithWaitlistUseCase } from './match-availability-with-waitlist.use-case.js';

const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';
const PATIENT_ID = '11111111-1111-4111-8111-111111111111';

class FakeAvailabilityWindowRepository implements AvailabilityWindowRepository {
  constructor(private readonly window: AvailabilityWindow | null) {}
  async findById(id: string): Promise<AvailabilityWindow | null> {
    return this.window?.getId() === id ? this.window : null;
  }
  async findOverlapping(): Promise<AvailabilityWindow[]> {
    return [];
  }
  async findByDoctorAndRange(): Promise<AvailabilityWindow[]> {
    return [];
  }
  async save(): Promise<void> {}
  async deleteById(): Promise<void> {}
}

class FakeWaitlistEntryRepository implements WaitlistEntryRepository {
  public claimedCallCount = 0;
  constructor(private readonly toClaim: WaitlistEntry | null) {}
  async findById(): Promise<WaitlistEntry | null> {
    return null;
  }
  async listByPatientId(): Promise<WaitlistEntry[]> {
    return [];
  }
  async hasActiveEntry(): Promise<boolean> {
    return false;
  }
  async claimEarliestEligibleEntry(): Promise<WaitlistEntry | null> {
    this.claimedCallCount += 1;
    // Simulates the real repository's own conditional UPDATE: only the
    // first call can ever claim it, matching the real "second concurrent
    // call finds zero rows" guarantee this fake exists to prove callers
    // rely on correctly.
    if (this.claimedCallCount > 1) {
      return null;
    }
    return this.toClaim;
  }
  async save(): Promise<void> {}
  async update(): Promise<void> {}
}

class FakeDomainEventDispatcher implements DomainEventDispatcher {
  public readonly dispatched: DomainEvent[] = [];
  async dispatch(events: DomainEvent[]): Promise<void> {
    this.dispatched.push(...events);
  }
  subscribe(): void {}
}

class ThrowingDomainEventDispatcher implements DomainEventDispatcher {
  async dispatch(): Promise<void> {
    throw new Error('simulated transient dispatch failure');
  }
  subscribe(): void {}
}

class FakeLogger {
  public errors: unknown[] = [];
  error(message: unknown, ...rest: unknown[]): void {
    this.errors.push({ message, rest });
  }
}

function buildOpenWindow(pricing = ConsultationPricing.free()): AvailabilityWindow {
  return AvailabilityWindow.define({
    doctorId: DOCTOR_ID,
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
    pricing,
  });
}

function buildWaitingEntry(): WaitlistEntry {
  const now = Date.now();
  return WaitlistEntry.join({
    patientId: PATIENT_ID,
    doctorId: DOCTOR_ID,
    earliestAcceptableAt: new Date(now + 1000),
    latestAcceptableAt: new Date(now + 30 * 24 * 60 * 60 * 1000),
  });
}

describe('MatchAvailabilityWithWaitlistUseCase', () => {
  it('claims the eligible entry and dispatches WaitlistOpportunityMatchedEvent when the window is Open', async () => {
    const window = buildOpenWindow();
    const entry = buildWaitingEntry();
    const dispatcher = new FakeDomainEventDispatcher();
    const useCase = new MatchAvailabilityWithWaitlistUseCase(
      new FakeWaitlistEntryRepository(entry),
      new GetAvailabilityWindowByIdUseCase(new FakeAvailabilityWindowRepository(window)),
      dispatcher,
      new FakeLogger() as never,
    );

    await useCase.execute({ availabilityWindowId: window.getId() });

    assert.equal(dispatcher.dispatched.length, 1);
    const event = dispatcher.dispatched[0] as WaitlistOpportunityMatchedEvent;
    assert.equal(event.eventName, 'waitlist.opportunity.matched');
    assert.equal(event.waitlistEntryId, entry.getId());
    assert.equal(event.patientId, PATIENT_ID);
  });

  it('does nothing when the window no longer exists', async () => {
    const dispatcher = new FakeDomainEventDispatcher();
    const useCase = new MatchAvailabilityWithWaitlistUseCase(
      new FakeWaitlistEntryRepository(buildWaitingEntry()),
      new GetAvailabilityWindowByIdUseCase(new FakeAvailabilityWindowRepository(null)),
      dispatcher,
      new FakeLogger() as never,
    );

    await useCase.execute({ availabilityWindowId: 'missing-id' });

    assert.equal(dispatcher.dispatched.length, 0);
  });

  it('does nothing when the window is Held, not Open', async () => {
    const window = buildOpenWindow();
    window.hold();
    assert.equal(window.getStatus(), AvailabilityWindowStatus.Held);
    const dispatcher = new FakeDomainEventDispatcher();
    const useCase = new MatchAvailabilityWithWaitlistUseCase(
      new FakeWaitlistEntryRepository(buildWaitingEntry()),
      new GetAvailabilityWindowByIdUseCase(new FakeAvailabilityWindowRepository(window)),
      dispatcher,
      new FakeLogger() as never,
    );

    await useCase.execute({ availabilityWindowId: window.getId() });

    assert.equal(dispatcher.dispatched.length, 0);
  });

  it('does nothing when no eligible entry is Waiting', async () => {
    const window = buildOpenWindow();
    const dispatcher = new FakeDomainEventDispatcher();
    const useCase = new MatchAvailabilityWithWaitlistUseCase(
      new FakeWaitlistEntryRepository(null),
      new GetAvailabilityWindowByIdUseCase(new FakeAvailabilityWindowRepository(window)),
      dispatcher,
      new FakeLogger() as never,
    );

    await useCase.execute({ availabilityWindowId: window.getId() });

    assert.equal(dispatcher.dispatched.length, 0);
  });

  it('a second concurrent call for the same window never double-claims/double-dispatches', async () => {
    const window = buildOpenWindow();
    const entry = buildWaitingEntry();
    const dispatcher = new FakeDomainEventDispatcher();
    const waitlistRepository = new FakeWaitlistEntryRepository(entry);
    const useCase = new MatchAvailabilityWithWaitlistUseCase(
      waitlistRepository,
      new GetAvailabilityWindowByIdUseCase(new FakeAvailabilityWindowRepository(window)),
      dispatcher,
      new FakeLogger() as never,
    );

    await Promise.all([
      useCase.execute({ availabilityWindowId: window.getId() }),
      useCase.execute({ availabilityWindowId: window.getId() }),
    ]);

    assert.equal(dispatcher.dispatched.length, 1);
  });

  it('swallows and logs a dispatch failure instead of throwing -- the AvailabilityWindow caller that raised this event must never fail because waitlist matching had a transient error', async () => {
    const window = buildOpenWindow();
    const logger = new FakeLogger();
    const useCase = new MatchAvailabilityWithWaitlistUseCase(
      new FakeWaitlistEntryRepository(buildWaitingEntry()),
      new GetAvailabilityWindowByIdUseCase(new FakeAvailabilityWindowRepository(window)),
      new ThrowingDomainEventDispatcher(),
      logger as never,
    );

    await assert.doesNotReject(() => useCase.execute({ availabilityWindowId: window.getId() }));

    assert.equal(logger.errors.length, 1);
  });
});
