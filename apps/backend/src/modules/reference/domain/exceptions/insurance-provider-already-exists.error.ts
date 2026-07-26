import { ReferenceDomainError } from './reference-domain.error.js';

export class InsuranceProviderAlreadyExistsError extends ReferenceDomainError {
  constructor(name: string) {
    super(`An insurance provider named "${name}" already exists.`);
  }
}
