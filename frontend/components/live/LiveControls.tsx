import { Camera, Play, Pause, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function LiveControls({
  status,
  onStart,
  onPause,
  onResume,
  onStop,
  onCapture,
}: {
  status: "idle" | "running" | "paused";
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCapture: () => void;
}) {
  if (status === "idle") {
    return (
      <Button onClick={onStart} size="lg" className="w-full">
        <Play size={16} />
        Start Inspection
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {status === "running" ? (
        <Button onClick={onPause} variant="secondary" size="lg">
          <Pause size={16} />
          Pause
        </Button>
      ) : (
        <Button onClick={onResume} size="lg">
          <Play size={16} />
          Resume
        </Button>
      )}
      <Button onClick={onStop} variant="danger" size="lg">
        <Square size={16} />
        Stop
      </Button>
      <Button onClick={onCapture} variant="outline" size="lg">
        <Camera size={16} />
        Capture Frame
      </Button>
    </div>
  );
}
