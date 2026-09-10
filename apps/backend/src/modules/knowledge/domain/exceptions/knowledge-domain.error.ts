export class KnowledgeDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KnowledgeDomainError';
  }
}
