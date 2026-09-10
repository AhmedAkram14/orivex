import { IsUUID } from 'class-validator';

export class StartMessageThreadRequestDto {
  @IsUUID()
  appointmentId!: string;
}
