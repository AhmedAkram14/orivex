'use client';

import { useQuery } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import type { HealthGraphNode } from '@/features/patient/api/types';
import { patientHealthGraphKeys } from '@/features/patient/hooks/query-keys';
import { usePatientProfile } from '@/features/patient/hooks/use-patient-profile';

export interface PatientHealthResults {
  labs: HealthGraphNode[];
  imaging: HealthGraphNode[];
}

const newestFirst = (a: HealthGraphNode, b: HealthGraphNode) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

/**
 * The patient's lab and imaging results: the `lab_result` and `radiology_result` nodes of their own health
 * graph, newest first. The graph is addressed by patient profile id, so this waits for the profile.
 */
export function usePatientHealthResults() {
  const profile = usePatientProfile();
  const patientProfileId = profile.data?.id;
  return useQuery({
    queryKey: patientHealthGraphKeys.detail(patientProfileId ?? ''),
    enabled: Boolean(patientProfileId),
    queryFn: () => patientApi.getHealthGraph(patientProfileId!),
    select: (nodes): PatientHealthResults => ({
      labs: nodes.filter((node) => node.nodeType === 'lab_result').sort(newestFirst),
      imaging: nodes.filter((node) => node.nodeType === 'radiology_result').sort(newestFirst),
    }),
  });
}
