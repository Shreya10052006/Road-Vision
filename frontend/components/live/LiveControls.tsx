import { Camera, Play, Pause, Square, SwitchCamera, Flashlight, FlashlightOff } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function LiveControls({
  status,
  onStart,
  onPause,
  onResume,
  onStop,
  onCapture,
  onFlipCamera,
  hasTorch,
  torchActive,
  onToggleTorch,
}: {
  status: "idle" | "running" | "paused";
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCapture: () => void;
  onFlipCamera?: () => void;
  hasTorch?: boolean;
  torchActive?: boolean;
  onToggleTorch?: () => void;
}) {
  if (status === "idle") {
    return (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Button onClick={onStart} size="lg" className="flex-1 shadow-md">
          <Play size={16} />
          Start Live Inspection
        </Button>
        {onFlipCamera && (
          <Button onClick={onFlipCamera} variant="outline" size="lg" className="sm:w-auto">
            <SwitchCamera size={16} />
            <span className="hidden sm:inline">Flip Camera</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {status === "running" ? (
        <Button onClick={onPause} variant="secondary" size="lg" className="flex-1 sm:flex-none">
          <Pause size={16} />
          Pause
        </Button>
      ) : (
        <Button onClick={onResume} size="lg" className="flex-1 sm:flex-none">
          <Play size={16} />
          Resume
        </Button>
      )}

      <Button onClick={onStop} variant="danger" size="lg" className="flex-1 sm:flex-none">
        <Square size={16} />
        Stop
      </Button>

      <Button onClick={onCapture} variant="outline" size="lg" className="flex-1 sm:flex-none">
        <Camera size={16} />
        <span className="hidden sm:inline">Capture</span> Frame
      </Button>

      {onFlipCamera && (
        <Button
          onClick={onFlipCamera}
          variant="outline"
          size="lg"
          className="flex-1 sm:flex-none"
          title="Flip Camera (Front/Back)"
        >
          <SwitchCamera size={16} />
          <span className="hidden sm:inline">Flip</span>
        </Button>
      )}

      {hasTorch && onToggleTorch && (
        <Button
          onClick={onToggleTorch}
          variant={torchActive ? "primary" : "outline"}
          size="lg"
          className="sm:flex-none"
          title="Toggle Flashlight"
        >
          {torchActive ? <FlashlightOff size={16} /> : <Flashlight size={16} />}
        </Button>
      )}
    </div>
  );
}
