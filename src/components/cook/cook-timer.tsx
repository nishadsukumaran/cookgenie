"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Plus, Volume2 } from "lucide-react";
import { useTimer } from "@/hooks/use-timer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CookTimerProps {
  durationMinutes: number;
  autoStart?: boolean;
  alertType?: "sound" | "voice" | "both" | "none";
  className?: string;
}

export function CookTimer({
  durationMinutes,
  autoStart = false,
  alertType = "sound",
  className,
}: CookTimerProps) {
  const playBeeps = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const beepCount = 3;
      for (let i = 0; i < beepCount; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.value = 0.3;
        const start = ctx.currentTime + i * 0.3;
        osc.start(start);
        osc.stop(start + 0.15);
      }
    } catch {
      // Web Audio API not available — silent fallback
    }
  }, []);

  const speakDone = useCallback(() => {
    try {
      const utterance = new SpeechSynthesisUtterance(
        "CookGenie: this step is done. Check your dish now."
      );
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis not available — silent fallback
    }
  }, []);

  const handleComplete = useCallback(() => {
    if (alertType === "sound" || alertType === "both") {
      playBeeps();
    }
    if (alertType === "voice" || alertType === "both") {
      // Small delay after beeps so they don't overlap
      const delay = alertType === "both" ? 1000 : 0;
      setTimeout(speakDone, delay);
    }
  }, [alertType, playBeeps, speakDone]);

  const {
    isRunning,
    isComplete,
    progress,
    status,
    formattedTime,
    start,
    pause,
    resume,
    reset,
    addTime,
  } = useTimer({
    durationMinutes,
    autoStart,
    onComplete: handleComplete,
  });

  if (!durationMinutes) return null;

  // SVG ring geometry
  const size = 128;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  const ringColor =
    status === "running"
      ? "stroke-primary"
      : status === "complete"
        ? "stroke-green-500"
        : "stroke-muted";

  const statusLabel =
    status === "idle"
      ? "Ready"
      : status === "running"
        ? "Cooking..."
        : status === "paused"
          ? "Paused"
          : "Done!";

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Circular progress ring with time display */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="-rotate-90"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/40"
          />
          {/* Animated progress arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={ringColor}
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
        </svg>

        {/* Centered time + status */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-mono font-bold tabular-nums">
            {formattedTime}
          </span>
          <span className="mt-0.5 text-xs text-muted-foreground">
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-2">
        {status === "idle" && (
          <Button onClick={start} className="rounded-full gap-1.5">
            <Play className="h-4 w-4" data-icon="inline-start" />
            Start Timer
          </Button>
        )}

        {status === "running" && (
          <>
            <Button
              variant="outline"
              onClick={pause}
              className="rounded-full gap-1.5"
            >
              <Pause className="h-4 w-4" data-icon="inline-start" />
              Pause
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addTime(30)}
              className="rounded-full gap-1"
            >
              <Plus className="h-3 w-3" data-icon="inline-start" />
              30s
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addTime(60)}
              className="rounded-full gap-1"
            >
              <Plus className="h-3 w-3" data-icon="inline-start" />
              1m
            </Button>
          </>
        )}

        {status === "paused" && (
          <>
            <Button onClick={resume} className="rounded-full gap-1.5">
              <Play className="h-4 w-4" data-icon="inline-start" />
              Resume
            </Button>
            <Button
              variant="outline"
              onClick={reset}
              className="rounded-full gap-1.5"
            >
              <RotateCcw className="h-4 w-4" data-icon="inline-start" />
              Reset
            </Button>
          </>
        )}

        {status === "complete" && (
          <>
            <Button
              variant="outline"
              onClick={reset}
              className="rounded-full gap-1.5"
            >
              <RotateCcw className="h-4 w-4" data-icon="inline-start" />
              Reset
            </Button>
            <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
              <Volume2 className="h-3 w-3" />
              Done!
            </Badge>
          </>
        )}
      </div>
    </div>
  );
}
