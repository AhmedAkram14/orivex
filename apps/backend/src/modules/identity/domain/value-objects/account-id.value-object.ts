const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AccountId {
  private constructor(private readonly value: string) {}

  static create(value: string): AccountId {
    if (!UUID_PATTERN.test(value)) {
      throw new Error(`AccountId must be a valid UUID, received: "${value}".`);
    }
    return new AccountId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: AccountId): boolean {
    return other instanceof AccountId && other.value === this.value;
  }
}
