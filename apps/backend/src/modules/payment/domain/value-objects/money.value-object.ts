import { PaymentDomainError } from '../exceptions/payment-domain.error.js';

// Matches docs/12-openapi.md's Money schema exactly (amount, currency).
export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: string,
  ) {}

  static create(amount: number, currency: string): Money {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new PaymentDomainError('amount must be a positive number.');
    }
    if (!currency || currency.trim().length === 0) {
      throw new PaymentDomainError('currency must not be empty.');
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
