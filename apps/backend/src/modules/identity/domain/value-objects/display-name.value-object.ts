import { MAX_DISPLAY_NAME_LENGTH } from '../constants/identity.constants.js';
import { InvalidDisplayNameError } from '../exceptions/invalid-display-name.error.js';

export class DisplayName {
  private constructor(private readonly value: string) {}

  static create(value: string): DisplayName {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new InvalidDisplayNameError('DisplayName must not be empty.');
    }
    if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
      throw new InvalidDisplayNameError(
        `DisplayName must not exceed ${MAX_DISPLAY_NAME_LENGTH} characters.`,
      );
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
