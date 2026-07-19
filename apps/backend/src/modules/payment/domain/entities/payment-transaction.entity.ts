import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { PaymentCompletedEvent } from '../events/payment-completed.event.js';
import { RefundIssuedEvent } from '../events/refund-issued.event.js';
import { PaymentDomainError } from '../exceptions/payment-domain.error.js';
import { PaymentMethod } from '../enums/payment-method.enum.js';
import { PaymentStatus } from '../enums/payment-status.enum.js';
import { Money } from '../value-objects/money.value-object.js';

export interface InitiateTransactionProps {
  idempotencyKey: string;
  consultationSessionId?: string;
  patientId: string;
  doctorId: string;
  amount: Money;
  paymentMethod: PaymentMethod;
}

export interface ReconstituteTransactionProps {
  id: string;
  idempotencyKey: string;
  consultationSessionId?: string;
  patientId: string;
  doctorId: string;
  amount: Money;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  externalReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Aggregate root of PaymentModule (docs/10-backend-architecture.md's
// PaymentModule entry: "Owned entities: PaymentTransaction, ..."; only
// PaymentTransaction is in this sprint's scope -- PayoutStatement is not).
// Lifecycle matches docs/09-physical-database.md's payment_transactions
// table: Initiated -> Succeeded/Failed -> Settled/Refunded/Disputed.
export class PaymentTransaction {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly idempotencyKey: string,
    private readonly consultationSessionId: string | undefined,
    private readonly patientId: string,
    private readonly doctorId: string,
    private readonly amount: Money,
    private readonly paymentMethod: PaymentMethod,
    private status: PaymentStatus,
    private externalReference: string | undefined,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static initiate(props: InitiateTransactionProps): PaymentTransaction {
    const now = new Date();
    return new PaymentTransaction(
      randomUUID(),
      props.idempotencyKey,
      props.consultationSessionId,
      props.patientId,
      props.doctorId,
      props.amount,
      props.paymentMethod,
      PaymentStatus.Initiated,
      undefined,
      now,
      now,
    );
  }

  static reconstitute(props: ReconstituteTransactionProps): PaymentTransaction {
    return new PaymentTransaction(
      props.id,
      props.idempotencyKey,
      props.consultationSessionId,
      props.patientId,
      props.doctorId,
      props.amount,
      props.paymentMethod,
      props.status,
      props.externalReference,
      props.createdAt,
      props.updatedAt,
    );
  }

  // Set once the gateway confirms the charge attempt (its own reference,
  // e.g. a Stripe PaymentIntent id) -- lets a later refund or an inbound
  // webhook event be matched back to this exact transaction. Callable
  // any time before a terminal state; not itself a state transition.
  attachExternalReference(reference: string): void {
    this.externalReference = reference;
    this.updatedAt = new Date();
  }

  // Called once PaymentGatewayPort reports a successful authorization.
  markSucceeded(): void {
    if (this.status !== PaymentStatus.Initiated) {
      throw new PaymentDomainError(`PaymentTransaction "${this.id}" is not Initiated and cannot succeed.`);
    }
    this.status = PaymentStatus.Succeeded;
    this.updatedAt = new Date();
    this.record(new PaymentCompletedEvent(this.id));
  }

  // Called once PaymentGatewayPort reports a failed authorization. No
  // domain event is raised -- only PaymentCompleted and RefundIssued are
  // documented (docs/05-information-architecture.md).
  markFailed(): void {
    if (this.status !== PaymentStatus.Initiated) {
      throw new PaymentDomainError(`PaymentTransaction "${this.id}" is not Initiated and cannot fail.`);
    }
    this.status = PaymentStatus.Failed;
    this.updatedAt = new Date();
  }

  settle(): void {
    if (this.status !== PaymentStatus.Succeeded) {
      throw new PaymentDomainError(`PaymentTransaction "${this.id}" is not Succeeded and cannot be settled.`);
    }
    this.status = PaymentStatus.Settled;
    this.updatedAt = new Date();
  }

  refund(): void {
    if (this.status !== PaymentStatus.Succeeded && this.status !== PaymentStatus.Settled) {
      throw new PaymentDomainError(`PaymentTransaction "${this.id}" cannot be refunded from its current status.`);
    }
    if (!this.externalReference) {
      throw new PaymentDomainError(`PaymentTransaction "${this.id}" has no gateway reference and cannot be refunded.`);
    }
    this.status = PaymentStatus.Refunded;
    this.updatedAt = new Date();
    this.record(new RefundIssuedEvent(this.id));
  }

  dispute(): void {
    if (this.status !== PaymentStatus.Succeeded && this.status !== PaymentStatus.Settled) {
      throw new PaymentDomainError(`PaymentTransaction "${this.id}" cannot be disputed from its current status.`);
    }
    this.status = PaymentStatus.Disputed;
    this.updatedAt = new Date();
  }

  getId(): string {
    return this.id;
  }

  getIdempotencyKey(): string {
    return this.idempotencyKey;
  }

  getConsultationSessionId(): string | undefined {
    return this.consultationSessionId;
  }

  getPatientId(): string {
    return this.patientId;
  }

  getDoctorId(): string {
    return this.doctorId;
  }

  getAmount(): Money {
    return this.amount;
  }

  getPaymentMethod(): PaymentMethod {
    return this.paymentMethod;
  }

  getStatus(): PaymentStatus {
    return this.status;
  }

  getExternalReference(): string | undefined {
    return this.externalReference;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  releaseDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  private record(event: DomainEvent): void {
    this.domainEvents.push(event);
  }
}
