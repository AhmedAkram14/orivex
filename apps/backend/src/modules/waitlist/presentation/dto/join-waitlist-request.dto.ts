import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum JoinWaitlistConsultationTypeDto {
  Free = 'free',
  Paid = 'paid',
}

export class JoinWaitlistRequestDto {
  @IsUUID()
  doctorId!: string;

  @IsOptional()
  @IsEnum(JoinWaitlistConsultationTypeDto)
  consultationType?: JoinWaitlistConsultationTypeDto;

  @IsDateString()
  earliestAcceptableAt!: string;

  @IsDateString()
  latestAcceptableAt!: string;
}
