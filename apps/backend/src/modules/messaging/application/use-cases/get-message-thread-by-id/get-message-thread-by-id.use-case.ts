import type { MessageThread } from '../../../domain/entities/message-thread.entity.js';
import type { MessageThreadRepository } from '../../../domain/repositories/message-thread.repository.js';

export interface GetMessageThreadByIdQuery {
  threadId: string;
}

// Pure read — mirrors the established Get*ByIdUseCase pattern.
export class GetMessageThreadByIdUseCase {
  constructor(private readonly messageThreadRepository: MessageThreadRepository) {}

  async execute(query: GetMessageThreadByIdQuery): Promise<MessageThread | null> {
    return this.messageThreadRepository.findById(query.threadId);
  }
}
