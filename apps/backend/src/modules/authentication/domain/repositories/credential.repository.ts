import type { Credential } from '../entities/credential.entity.js';

export interface CredentialRepository {
  findByAccountId(accountId: string): Promise<Credential | null>;
  findById(id: string): Promise<Credential | null>;
  save(credential: Credential): Promise<void>;
}
