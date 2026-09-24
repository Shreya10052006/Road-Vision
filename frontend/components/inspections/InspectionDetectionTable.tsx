import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PriorityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { damageTypeConfig } from "@/lib/priorityConfig";
import type { Detection } from "@/lib/types";

export function InspectionDetectionTable({
  detections,
  onView,
}: {
  detections: Detection[];
  onView: (id: string) => void;
}) {
  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>Detections</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="font-medium px-2 pb-2">Frame</th>
              <th className="font-medium px-2 pb-2">Timestamp</th>
              <th className="font-medium px-2 pb-2">Damage Type</th>
              <th className="font-medium px-2 pb-2">Confidence</th>
              <th className="font-medium px-2 pb-2">Priority</th>
              <th className="font-medium px-2 pb-2">Location</th>
              <th className="font-medium px-2 pb-2 text-right">View</th>
            </tr>
          </thead>
          <tbody>
            {detections.map((d) => (
              <tr key={d.id} className="border-t border-border hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-2 py-2.5 text-slate-500 dark:text-slate-400">{d.frameIndex}</td>
                <td className="px-2 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">{d.timestamp}</td>
                <td className="px-2 py-2.5 text-slate-700 dark:text-slate-200">{damageTypeConfig[d.damageType].label}</td>
                <td className="px-2 py-2.5 text-slate-600 dark:text-slate-300">{(d.confidence * 100).toFixed(0)}%</td>
                <td className="px-2 py-2.5"><PriorityBadge priority={d.priority} compact /></td>
                <td className="px-2 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{d.road}, {d.area}</td>
                <td className="px-2 py-2.5 text-right">
                  <Button variant="ghost" size="sm" onClick={() => onView(d.id)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
