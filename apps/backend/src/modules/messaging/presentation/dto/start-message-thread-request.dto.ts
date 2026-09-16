import { IsUUID } from 'class-validator';

export class StartMessageThreadRequestDto {
  @IsUUID()
  counterpartyProfileId!: string;
}
