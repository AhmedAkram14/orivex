import type { Country } from '../../domain/entities/country.entity.js';

export class CountryResponseDto {
  id!: string;
  name!: string;
  iso2Code!: string;
  isActive!: boolean;
  createdAt!: string;
  updatedAt!: string;

  static fromDomain(country: Country): CountryResponseDto {
    const dto = new CountryResponseDto();
    dto.id = country.getId();
    dto.name = country.getName();
    dto.iso2Code = country.getIso2Code();
    dto.isActive = country.getIsActive();
    dto.createdAt = country.getCreatedAt().toISOString();
    dto.updatedAt = country.getUpdatedAt().toISOString();
    return dto;
  }
}
