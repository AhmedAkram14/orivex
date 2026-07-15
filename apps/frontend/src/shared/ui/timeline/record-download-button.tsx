import { Download } from 'lucide-react';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';

export interface RecordDownloadButtonProps {
  /** A real, already-resolved download URL (e.g. an `AssetModule` presigned link) — never rendered for an entry that has none, per the caller's own "no fake business logic" obligation. This component itself does no fetching. */
  href: string;
  label: string;
  className?: string;
}

/**
 * The Medical Records timeline's "download-ready" architecture: a real
 * download link, styled as a `Button`, ready to receive a real
 * `AssetModule`-issued URL once document attachments are wired into the
 * frontend. No entry in this milestone's mock data has one yet — this
 * component exists and is tested, but is honestly never rendered until a
 * real attachment reference exists (see `mocks/patient-store.ts`).
 */
export function RecordDownloadButton({ href, label, className }: RecordDownloadButtonProps) {
  return (
    <Button asChild variant="outline" size="sm" className={className}>
      <a href={href} download>
        <Icon icon={Download} size="sm" className="me-2" />
        {label}
      </a>
    </Button>
  );
}
