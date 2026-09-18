'use client';

import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useExportDoctorReports, type DoctorReportsExportFilter } from '@/features/doctor/hooks/use-export-doctor-reports';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/icons/icon';

export interface ExportReportsButtonProps {
  filter: DoctorReportsExportFilter;
}

/**
 * Doctor Reports page rebuild (Phase 2): CSV export trigger for the doctor's
 * own reports page -- visually mirrors the admin `ExportButton` (same
 * icon/label/loading-state pattern) but is its own component, typed for this
 * doctor-scoped filter rather than admin's `ReportSection`/`ReportFilterParams`.
 */
export function ExportReportsButton({ filter }: ExportReportsButtonProps) {
  const t = useTranslations('doctor.reports.export');
  const { exportReports, isExporting, error } = useExportDoctorReports();

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={() => exportReports(filter)} disabled={isExporting}>
        <Icon icon={Download} size="sm" />
        {isExporting ? t('exporting') : t('exportCsv')}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {t('exportError')}
        </span>
      )}
    </div>
  );
}
