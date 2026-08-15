import type { GlobalSearchResult, SearchResultType } from '../../application/use-cases/global-search/global-search.use-case.js';

// Discriminated-union result shape, never a raw entity: no `metadata` blob,
// no nested entity objects, no href -- the frontend decides per-role
// navigation, this response is not coupled to any frontend route.
export class SearchResultDto {
  type!: SearchResultType;
  id!: string;
  title!: string;
  subtitle!: string;
}

export class SearchResponseDto {
  results!: SearchResultDto[];
  total!: number;

  static fromResult(result: GlobalSearchResult): SearchResponseDto {
    const dto = new SearchResponseDto();
    dto.results = result.results.map((item) => {
      const resultDto = new SearchResultDto();
      resultDto.type = item.type;
      resultDto.id = item.id;
      resultDto.title = item.title;
      resultDto.subtitle = item.subtitle;
      return resultDto;
    });
    dto.total = result.total;
    return dto;
  }
}
