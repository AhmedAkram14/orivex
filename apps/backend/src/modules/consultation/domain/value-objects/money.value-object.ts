import { ConsultationDomainError } from '../exceptions/consultation-domain.error.js';

// ConsultationModule's own copy of PaymentModule's Money shape -- domain
// layers never import across module boundaries (same convention already
// applied to ConsultationType).
export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: string,
  ) {}

  static create(amount: number, currency: string): Money {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ConsultationDomainError('Consultation fee amount must be a positive number.');
    }
    if (!currency || currency.trim().length === 0) {
      throw new ConsultationDomainError('Consultation fee currency must not be empty.');
    }
    return new Money(amount, currency.trim().toUpperCase());
  }

  getAmount(): number {
    return this.amount;
  }

  getCurrency(): string {
    return this.currency;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
