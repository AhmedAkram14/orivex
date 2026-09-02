'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import {
  doctorPatientChartAppointmentsKeys,
  doctorPatientChartDocumentsKeys,
  doctorPatientChartMedicalRecordsKeys,
  doctorPatientChartPrescriptionsKeys,
  doctorPatientChartProfileKeys,
  doctorPatientChartVitalsKeys,
} from '@/features/doctor/hooks/query-keys';

/**
 * The authenticated, authorized clinical chart -- one hook per real backend
 * section (`GET /doctor/patients/:id/*`), each independently loading/
 * error-able so one slow/failed section never blocks the rest of the page.
 * Every request requires a real sign-in AND a real doctor-patient
 * relationship, enforced server-side (never by hiding this hook's result).
 */
export function useDoctorPatientChartProfile(patientProfileId: string | undefined) {
  return useQuery({
    queryKey: doctorPatientChartProfileKeys.detail(patientProfileId ?? ''),
    queryFn: () => doctorApi.getPatientChartProfile(patientProfileId!),
    enabled: Boolean(patientProfileId),
  });
}

export function useDoctorPatientChartAppointments(patientProfileId: string | undefined) {
  return useQuery({
    queryKey: doctorPatientChartAppointmentsKeys.detail(patientProfileId ?? ''),
    queryFn: () => doctorApi.getPatientChartAppointments(patientProfileId!),
    enabled: Boolean(patientProfileId),
  });
}

export function useDoctorPatientChartMedicalRecords(patientProfileId: string | undefined) {
  return useQuery({
    queryKey: doctorPatientChartMedicalRecordsKeys.detail(patientProfileId ?? ''),
    queryFn: () => doctorApi.getPatientChartMedicalRecords(patientProfileId!),
    enabled: Boolean(patientProfileId),
  });
}

export function useDoctorPatientChartPrescriptions(patientProfileId: string | undefined) {
  return useQuery({
    queryKey: doctorPatientChartPrescriptionsKeys.detail(patientProfileId ?? ''),
    queryFn: () => doctorApi.getPatientChartPrescriptions(patientProfileId!),
    enabled: Boolean(patientProfileId),
  });
}

export function useDoctorPatientChartDocuments(patientProfileId: string | undefined) {
  return useQuery({
    queryKey: doctorPatientChartDocumentsKeys.detail(patientProfileId ?? ''),
    queryFn: () => doctorApi.getPatientChartDocuments(patientProfileId!),
    enabled: Boolean(patientProfileId),
  });
}

export function useDoctorPatientChartVitals(patientProfileId: string | undefined) {
  return useQuery({
    queryKey: doctorPatientChartVitalsKeys.detail(patientProfileId ?? ''),
    queryFn: () => doctorApi.getPatientChartVitals(patientProfileId!),
    enabled: Boolean(patientProfileId),
  });
}
