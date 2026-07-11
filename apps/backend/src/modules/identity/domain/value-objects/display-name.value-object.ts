const MAX_LENGTH = 100;

export class DisplayName {
  private constructor(private readonly value: string) {}

  static create(value: string): DisplayName {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('DisplayName must not be empty.');
    }
    if (trimmed.length > MAX_LENGTH) {
      throw new Error(`DisplayName must not exceed ${MAX_LENGTH} characters.`);
    }
    return new DisplayName(trimmed);
  }

  toString(): string {
    return this.value;
  }

  equals(other: DisplayName): boolean {
    return other instanceof DisplayName && other.value === this.value;
  }
}
