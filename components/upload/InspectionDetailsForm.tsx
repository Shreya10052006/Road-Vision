import { Input, Label } from "@/components/ui/Controls";

export interface InspectionDetailsValue {
  inspectionName: string;
  roadName: string;
  city: string;
  ward: string;
  inspectorName: string;
}

export function InspectionDetailsForm({
  value,
  onChange,
}: {
  value: InspectionDetailsValue;
  onChange: (v: InspectionDetailsValue) => void;
}) {
  const set = (key: keyof InspectionDetailsValue) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: e.target.value });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <Label>Inspection Name</Label>
        <Input placeholder="e.g. Morning Patrol — Zone 4" value={value.inspectionName} onChange={set("inspectionName")} />
      </div>
      <div>
        <Label>Road Name</Label>
        <Input placeholder="e.g. Anna Salai" value={value.roadName} onChange={set("roadName")} />
      </div>
      <div>
        <Label>City</Label>
        <Input placeholder="e.g. Chennai" value={value.city} onChange={set("city")} />
      </div>
      <div>
        <Label>Ward / Area</Label>
        <Input placeholder="e.g. Teynampet" value={value.ward} onChange={set("ward")} />
      </div>
      <div>
        <Label>Inspector Name</Label>
        <Input placeholder="e.g. R. Muthu" value={value.inspectorName} onChange={set("inspectorName")} />
      </div>
    </div>
  );
}
