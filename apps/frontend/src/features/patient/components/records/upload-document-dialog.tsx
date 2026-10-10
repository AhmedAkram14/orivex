'use client';

import { useTranslations } from 'next-intl';
import { DocumentUploadTile } from '@/features/patient/components/records/document-upload-tile';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

/** The header's Upload document: the same tile as the Documents tab, from anywhere on the page. */
export function UploadDocumentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations('patient.records.uploadDialog');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open: each opening starts from an empty tile. */}
        {open && <DocumentUploadTile className="mt-4" />}
        <DialogFooter className="mt-2">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              {t('done')}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
