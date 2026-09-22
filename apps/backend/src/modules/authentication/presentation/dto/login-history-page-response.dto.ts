import type { ListLoginHistoryForAccountResult } from '../../application/use-cases/list-login-history-for-account/list-login-history-for-account.use-case.js';

import { LoginHistoryEntryResponseDto } from './login-history-entry-response.dto.js';

// Page-based, matching the frontend's shared Pagination component
// (shared/ui/pagination.tsx), which is driven by { page, pageCount }.
export class LoginHistoryPageResponseDto {
  items!: LoginHistoryEntryResponseDto[];
  total!: number;
  page!: number;
  pageCount!: number;

  static fromResult(result: ListLoginHistoryForAccountResult): LoginHistoryPageResponseDto {
    const dto = new LoginHistoryPageResponseDto();
    dto.items = result.items.map((event) => LoginHistoryEntryResponseDto.fromDomain(event));
    dto.total = result.total;
    dto.page = result.page;
    dto.pageCount = result.pageCount;
    return dto;
  }
}
