import { Card } from "@/components/ui/Card";
import { PriorityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Camera } from "lucide-react";
import { damageTypeConfig } from "@/lib/priorityConfig";
import type { Detection } from "@/lib/types";

export function DetectionTable({ detections, onView }: { detections: Detection[]; onView: (id: string) => void }) {
  return (
    <Card className="p-5">
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="font-medium px-2 pb-2">ID</th>
              <th className="font-medium px-2 pb-2">Image</th>
              <th className="font-medium px-2 pb-2">Type</th>
              <th className="font-medium px-2 pb-2">Confidence</th>
              <th className="font-medium px-2 pb-2">Priority</th>
              <th className="font-medium px-2 pb-2">Road</th>
              <th className="font-medium px-2 pb-2">Time</th>
              <th className="font-medium px-2 pb-2">Inspection</th>
              <th className="font-medium px-2 pb-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {detections.map((d) => (
              <tr key={d.id} className="border-t border-border hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-2 py-2.5 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{d.id}</td>
                <td className="px-2 py-2.5">
                  <div className="w-10 h-8 rounded-md bg-slate-900 flex items-center justify-center">
                    <Camera size={13} className="text-slate-600" />
                  </div>
                </td>
                <td className="px-2 py-2.5 text-slate-700 dark:text-slate-200 whitespace-nowrap">{damageTypeConfig[d.damageType].label}</td>
                <td className="px-2 py-2.5 text-slate-600 dark:text-slate-300">{(d.confidence * 100).toFixed(0)}%</td>
                <td className="px-2 py-2.5"><PriorityBadge priority={d.priority} compact /></td>
                <td className="px-2 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{d.road}</td>
                <td className="px-2 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{d.detectedAt}</td>
                <td className="px-2 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{d.inspectionId}</td>
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
