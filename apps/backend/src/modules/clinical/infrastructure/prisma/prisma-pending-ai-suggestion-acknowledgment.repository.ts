import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { PendingAISuggestionAcknowledgmentRepository } from '../../domain/repositories/pending-ai-suggestion-acknowledgment.repository.js';

@Injectable()
export class PrismaPendingAISuggestionAcknowledgmentRepository implements PendingAISuggestionAcknowledgmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createPending(suggestionId: string, consultationSessionId: string): Promise<void> {
    await this.prisma.pendingAISuggestionAcknowledgment.create({
      data: { suggestionId, consultationSessionId },
    });
  }

  async acknowledge(suggestionId: string): Promise<void> {
    await this.prisma.pendingAISuggestionAcknowledgment.updateMany({
      where: { suggestionId, acknowledgedAt: null },
      data: { acknowledgedAt: new Date() },
    });
  }

  async hasUnacknowledged(consultationSessionId: string): Promise<boolean> {
    const count = await this.prisma.pendingAISuggestionAcknowledgment.count({
      where: { consultationSessionId, acknowledgedAt: null },
    });
    return count > 0;
  }
}
