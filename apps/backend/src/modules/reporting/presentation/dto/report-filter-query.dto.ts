import { Type } from 'class-transformer';
import { IsBooleanString, IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

import { ConsultationType } from '../../../consultation/domain/enums/consultation-type.enum.js';
import { PaymentStatus } from '../../../payment/domain/enums/payment-status.enum.js';
import { VerificationStatus } from '../../../trust/domain/enums/verification-status.enum.js';
import type { ReportFilter, ReportFilterWithCompare } from '../../application/dto/report-filter.js';

export class ReportFilterQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsOptional()
  @IsUUID()
  specialtyId?: string;

  @IsOptional()
  @IsEnum(ConsultationType)
  consultationType?: ConsultationType;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @IsOptional()
  @IsBooleanString()
  comparePrevious?: string;

  toFilter(): ReportFilterWithCompare {
    const filter: ReportFilter = {
      dateFrom: this.dateFrom ? new Date(this.dateFrom) : undefined,
      dateTo: this.dateTo ? new Date(this.dateTo) : undefined,
      doctorId: this.doctorId,
      specialtyId: this.specialtyId,
      consultationType: this.consultationType,
      paymentStatus: this.paymentStatus,
      verificationStatus: this.verificationStatus,
    };
    return { ...filter, comparePrevious: this.comparePrevious === 'true' };
  }
}

export class AppointmentAnalyticsQueryDto extends ReportFilterQueryDto {
  @IsOptional()
  @IsIn(['day', 'week', 'month', 'year'])
  bucket?: 'day' | 'week' | 'month' | 'year';
}

export class DoctorAnalyticsQueryDto extends ReportFilterQueryDto {
  @IsOptional()
  @IsIn(['revenue', 'rating', 'completedConsultations', 'patientCount'])
  sortBy?: 'revenue' | 'rating' | 'completedConsultations' | 'patientCount';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ExportReportQueryDto extends ReportFilterQueryDto {
  @IsIn(['appointments', 'doctors', 'patients', 'payments', 'telemedicine', 'verification', 'notifications'])
  report!: 'appointments' | 'doctors' | 'patients' | 'payments' | 'telemedicine' | 'verification' | 'notifications';
}
