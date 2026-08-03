'use client';

import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useExportReport } from '@/features/reporting/hooks/use-export-report';
import type { ReportFilterParams, ReportSection } from '@/features/reporting/api/types';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/icons/icon';

export interface ExportButtonProps {
  section: ReportSection;
  filter: ReportFilterParams;
}

/** CSV export trigger for a single analytics section -- Excel/PDF are explicitly out of scope this pass (approved decision: CSV now, zero new dependency). */
export function ExportButton({ section, filter }: ExportButtonProps) {
  const t = useTranslations('admin.analytics.export');
  const { exportReport, isExporting, error } = useExportReport();

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={() => exportReport(section, filter)} disabled={isExporting}>
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
