import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { GetAccountByIdUseCase } from '../../application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { RegisterAccountCommand } from '../../application/use-cases/register-account/register-account.command.js';
import { RegisterAccountUseCase } from '../../application/use-cases/register-account/register-account.use-case.js';
import { SuspendAccountCommand } from '../../application/use-cases/suspend-account/suspend-account.command.js';
import { SuspendAccountUseCase } from '../../application/use-cases/suspend-account/suspend-account.use-case.js';
import { AccountResponseDto } from '../dto/account-response.dto.js';
import { RegisterAccountRequestDto } from '../dto/register-account-request.dto.js';
import { mapIdentityError } from '../mappers/identity-exception.mapper.js';

@Controller('accounts')
export class AccountController {
  constructor(
    private readonly registerAccountUseCase: RegisterAccountUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly suspendAccountUseCase: SuspendAccountUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterAccountRequestDto): Promise<ResponseEnvelope<AccountResponseDto>> {
    try {
      const account = await this.registerAccountUseCase.execute(
        new RegisterAccountCommand({
          email: body.email,
          role: body.role,
          displayName: body.displayName,
          preferredLanguage: body.preferredLanguage,
        }),
      );
      return envelope(AccountResponseDto.fromDomain(account));
    } catch (error) {
      throw mapIdentityError(error);
    }
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseEnvelope<AccountResponseDto>> {
    try {
      const account = await this.getAccountByIdUseCase.execute({ accountId: id });
      if (!account) {
        throw new NotFoundError(`Account "${id}" not found.`);
      }
      return envelope(AccountResponseDto.fromDomain(account));
    } catch (error) {
      throw mapIdentityError(error);
    }
  }

  @Patch(':id/suspend')
  async suspend(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseEnvelope<AccountResponseDto>> {
    try {
      await this.suspendAccountUseCase.execute(new SuspendAccountCommand({ accountId: id }));

      // SuspendAccountUseCase returns void by design (unchanged from Sprint
      // 1.1B) — read-after-write here instead of changing its signature,
      // per architect decision to keep this sprint's footprint minimal.
      const account = await this.getAccountByIdUseCase.execute({ accountId: id });
      if (!account) {
        throw new NotFoundError(`Account "${id}" not found.`);
      }
      return envelope(AccountResponseDto.fromDomain(account));
    } catch (error) {
      throw mapIdentityError(error);
    }
  }
}
