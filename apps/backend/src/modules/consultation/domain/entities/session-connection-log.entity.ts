import { randomUUID } from 'node:crypto';

import { ConsultationDomainError } from '../exceptions/consultation-domain.error.js';

export interface CreateSessionConnectionLogProps {
  note: string;
}

// Child entity of the ConsultationSession aggregate (docs/10-backend-
// architecture.md's ConsultationModule entry: "Owned entities: ...
// SessionConnectionLog"). Append-only "technical quality records"
// (docs/09-physical-database.md) -- no update methods, no lifecycle.
export class SessionConnectionLog {
  private constructor(
    private readonly id: string,
    private readonly note: string,
    private readonly occurredAt: Date,
  ) {}

  static create(props: CreateSessionConnectionLogProps): SessionConnectionLog {
    if (!props.note || props.note.trim().length === 0) {
      throw new ConsultationDomainError('SessionConnectionLog note must not be empty.');
    }
    return new SessionConnectionLog(randomUUID(), props.note.trim(), new Date());
  }

  static reconstitute(props: { id: string; note: string; occurredAt: Date }): SessionConnectionLog {
    return new SessionConnectionLog(props.id, props.note, props.occurredAt);
  }

  getId(): string {
    return this.id;
  }

  getNote(): string {
    return this.note;
  }

  getOccurredAt(): Date {
    return this.occurredAt;
  }
}
