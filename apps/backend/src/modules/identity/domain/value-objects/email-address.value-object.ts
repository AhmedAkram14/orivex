const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailAddress {
  private constructor(private readonly value: string) {}

  static create(value: string): EmailAddress {
    const normalized = value.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new Error(`EmailAddress must be a valid email address, received: "${value}".`);
    }
    return new EmailAddress(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: EmailAddress): boolean {
    return other instanceof EmailAddress && other.value === this.value;
  }
}
