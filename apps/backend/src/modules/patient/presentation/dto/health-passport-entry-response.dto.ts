import type { HealthPassportEntry } from '../../domain/entities/health-passport-entry.entity.js';
import type { HealthPassportEntryCategory } from '../../domain/enums/health-passport-entry-category.enum.js';

export class HealthPassportEntryResponseDto {
  id!: string;
  category!: HealthPassportEntryCategory;
  title!: string;
  detail!: string | null;
  occurredAt!: string | null;
  createdAt!: string;

  static fromDomain(entry: HealthPassportEntry): HealthPassportEntryResponseDto {
    const dto = new HealthPassportEntryResponseDto();
    dto.id = entry.getId();
    dto.category = entry.getCategory();
    dto.title = entry.getTitle();
    dto.detail = entry.getDetail() ?? null;
    dto.occurredAt = entry.getOccurredAt()?.toISOString() ?? null;
    dto.createdAt = entry.getCreatedAt().toISOString();
    return dto;
  }
}
