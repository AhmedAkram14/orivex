import { createQueryKeyFactory } from '@/shared/lib/api/query-keys';

export const schedulingRulesKeys = createQueryKeyFactory('scheduling-rules');
export const doctorAvailabilityKeys = createQueryKeyFactory('scheduling-doctor-availability');
export const doctorExceptionsKeys = createQueryKeyFactory('scheduling-doctor-exceptions');
export const holidaysKeys = createQueryKeyFactory('scheduling-holidays');
export const availabilityWindowsKeys = createQueryKeyFactory('scheduling-availability-windows');
