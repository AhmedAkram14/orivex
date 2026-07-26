import { ReferenceDomainError } from './reference-domain.error.js';

export class CountryAlreadyExistsError extends ReferenceDomainError {
  constructor(name: string) {
    super(`A country named "${name}" already exists.`);
  }
}
