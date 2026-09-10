import { ValidationError } from '../../../../shared/errors/app-error.js';
import { KnowledgeDomainError } from '../../domain/exceptions/knowledge-domain.error.js';

export function mapKnowledgeError(error: unknown): unknown {
  if (error instanceof KnowledgeDomainError) {
    return new ValidationError(error.message);
  }
  return error;
}
