import type { InsuranceProvider } from '../../domain/entities/insurance-provider.entity.js';

export class InsuranceProviderResponseDto {
  id!: string;
  name!: string;
  isActive!: boolean;
  createdAt!: string;
  updatedAt!: string;

  static fromDomain(provider: InsuranceProvider): InsuranceProviderResponseDto {
    const dto = new InsuranceProviderResponseDto();
    dto.id = provider.getId();
    dto.name = provider.getName();
    dto.isActive = provider.getIsActive();
    dto.createdAt = provider.getCreatedAt().toISOString();
    dto.updatedAt = provider.getUpdatedAt().toISOString();
    return dto;
  }
}
