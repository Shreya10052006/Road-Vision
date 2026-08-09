import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
      </CardHeader>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

export function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-2">
      <div>
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</div>
        {description && <div className="text-xs text-slate-400 mt-0.5">{description}</div>}
      </div>
      <div className="shrink-0 w-48">{children}</div>
    </div>
  );
}
