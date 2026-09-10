export class MessagingDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MessagingDomainError';
  }
}
