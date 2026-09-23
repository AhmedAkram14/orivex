export interface QuickStatProps {
  label: string;
  value: string;
}

export function QuickStat({ label, value }: QuickStatProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border-default/70 bg-surface px-4 py-3">
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="text-lg font-semibold text-text-primary">{value}</p>
    </div>
  );
}
