import type { Account } from '../../../identity/domain/entities/account.entity.js';
import { AccountResponseDto } from '../../../identity/presentation/dto/account-response.dto.js';

export class ListAccountsResponseDto {
  accounts!: AccountResponseDto[];
  total!: number;
  page!: number;
  limit!: number;

  static fromDomain(result: { accounts: Account[]; total: number }, page: number, limit: number): ListAccountsResponseDto {
    const dto = new ListAccountsResponseDto();
    dto.accounts = result.accounts.map((account) => AccountResponseDto.fromDomain(account));
    dto.total = result.total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}
