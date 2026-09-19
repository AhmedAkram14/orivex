'use client';

import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useExportDoctorEarnings } from '@/features/payment/hooks/use-export-doctor-earnings';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/icons/icon';
import type { DoctorEarningsFilterParams } from '@/features/payment/api/types';

export interface ExportEarningsButtonProps {
  filter: DoctorEarningsFilterParams;
}

/**
 * Doctor Earnings page rebuild (Phase 3): CSV export trigger for the
 * doctor's own earnings page -- own component in `features/payment`
 * mirroring `ExportReportsButton`'s exact icon/label/loading-state pattern,
 * typed against this feature's own filter shape rather than importing
 * Reports' `DoctorReportsExportFilter`.
 */
export function ExportEarningsButton({ filter }: ExportEarningsButtonProps) {
  const t = useTranslations('doctor.earnings.export');
  const { exportEarnings, isExporting, error } = useExportDoctorEarnings();

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={() => exportEarnings(filter)} disabled={isExporting}>
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
