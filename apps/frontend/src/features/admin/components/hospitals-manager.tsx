'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCreateDepartment } from '@/features/admin/hooks/use-create-department';
import { useCreateHospital } from '@/features/admin/hooks/use-create-hospital';
import { useDepartments } from '@/features/admin/hooks/use-departments';
import { useHospitals } from '@/features/admin/hooks/use-hospitals';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';

/**
 * Hospital/Department org-chart management (ORIVEX Roadmap 2.0 Stage 4) --
 * plain grouping data, not a multi-tenant boundary (see Hospital entity's
 * own comment on the backend). A hospital is selected to reveal its
 * department list + a create-department form beneath it.
 */
export function HospitalsManager() {
  const t = useTranslations('admin.hospitals');
  const { data: hospitals, isLoading, isError } = useHospitals();
  const createHospital = useCreateHospital();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | undefined>(undefined);

  async function handleCreateHospital(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    await createHospital.mutateAsync({ name: name.trim(), address: address.trim() || undefined });
    setName('');
    setAddress('');
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('createTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateHospital} className="flex flex-wrap items-end gap-3" noValidate>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="hospital-name" className="text-sm font-medium text-text-primary">
                {t('nameLabel')}
              </label>
              <Input
                id="hospital-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="hospital-address" className="text-sm font-medium text-text-primary">
                {t('addressLabel')}
              </label>
              <Input id="hospital-address" value={address} onChange={(event) => setAddress(event.target.value)} />
            </div>
            <Button type="submit" loading={createHospital.isPending}>
              {t('create')}
            </Button>
          </form>
          {createHospital.isError && (
            <Alert variant="danger" className="mt-3">
              {t('createError')}
            </Alert>
          )}
        </CardContent>
      </Card>

      {isError && <Alert variant="danger">{t('loadError')}</Alert>}

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !hospitals || hospitals.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
      ) : (
        <div className="flex flex-col gap-2">
          {hospitals.map((hospital) => (
            <div key={hospital.id} className="rounded-lg border border-border-default">
              <button
                type="button"
                onClick={() => setSelectedHospitalId(selectedHospitalId === hospital.id ? undefined : hospital.id)}
                className="flex w-full items-center justify-between gap-3 p-4 text-start"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">{hospital.name}</p>
                  {hospital.address && <p className="text-xs text-text-tertiary">{hospital.address}</p>}
                </div>
                <Badge variant="neutral">{t('viewDepartments')}</Badge>
              </button>
              {selectedHospitalId === hospital.id && <DepartmentsPanel hospitalId={hospital.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DepartmentsPanel({ hospitalId }: { hospitalId: string }) {
  const t = useTranslations('admin.hospitals');
  const { data: departments, isLoading, isError } = useDepartments(hospitalId);
  const createDepartment = useCreateDepartment(hospitalId);
  const [departmentName, setDepartmentName] = useState('');

  async function handleCreateDepartment(event: React.FormEvent) {
    event.preventDefault();
    if (!departmentName.trim()) return;
    await createDepartment.mutateAsync({ name: departmentName.trim() });
    setDepartmentName('');
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border-default p-4">
      {isError && <Alert variant="danger">{t('departmentsLoadError')}</Alert>}
      {isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : departments && departments.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {departments.map((department) => (
            <li key={department.id}>
              <Badge variant="info">{department.name}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-tertiary">{t('noDepartments')}</p>
      )}

      <form onSubmit={handleCreateDepartment} className="flex items-end gap-3" noValidate>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor={`department-name-${hospitalId}`} className="text-sm font-medium text-text-primary">
            {t('departmentNameLabel')}
          </label>
          <Input
            id={`department-name-${hospitalId}`}
            value={departmentName}
            onChange={(event) => setDepartmentName(event.target.value)}
          />
        </div>
        <Button type="submit" size="sm" variant="outline" loading={createDepartment.isPending}>
          {t('addDepartment')}
        </Button>
      </form>
      {createDepartment.isError && <Alert variant="danger">{t('departmentCreateError')}</Alert>}
    </div>
  );
}
