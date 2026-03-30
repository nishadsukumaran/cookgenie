import { useState, useEffect, useRef, useCallback } from "react";

interface UseTimerOptions {
  durationMinutes: number;
  autoStart?: boolean;
  onComplete?: () => void;
}

interface UseTimerReturn {
  secondsRemaining: number;
  isRunning: boolean;
  isComplete: boolean;
  progress: number;
  status: "idle" | "running" | "paused" | "complete";
  formattedTime: string;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  addTime: (seconds: number) => void;
}

export function useTimer({
  durationMinutes,
  autoStart = false,
  onComplete,
}: UseTimerOptions): UseTimerReturn {
  const totalSeconds = durationMinutes * 60;

  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);
  const [status, setStatus] = useState<"idle" | "running" | "paused" | "complete">(
    autoStart ? "running" : "idle"
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep the callback ref current without triggering re-renders
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startInterval = useCallback(() => {
    clearTimer();
    intervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearTimer();
          setStatus("complete");
          onCompleteRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const start = useCallback(() => {
    setSecondsRemaining(totalSeconds);
    setStatus("running");
    startInterval();
  }, [totalSeconds, startInterval]);

  const pause = useCallback(() => {
    clearTimer();
    setStatus("paused");
  }, [clearTimer]);

  const resume = useCallback(() => {
    setStatus("running");
    startInterval();
  }, [startInterval]);

  const reset = useCallback(() => {
    clearTimer();
    setSecondsRemaining(totalSeconds);
    setStatus("idle");
  }, [clearTimer, totalSeconds]);

  const addTime = useCallback((seconds: number) => {
    setSecondsRemaining((prev) => Math.max(0, prev + seconds));
  }, []);

  // Auto-start on mount
  useEffect(() => {
    if (autoStart) {
      startInterval();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset when durationMinutes changes
  useEffect(() => {
    clearTimer();
    setSecondsRemaining(durationMinutes * 60);
    setStatus("idle");
  }, [durationMinutes, clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const isRunning = status === "running";
  const isComplete = status === "complete";
  const progress = totalSeconds > 0 ? (totalSeconds - secondsRemaining) / totalSeconds : 0;

  const minutes = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return {
    secondsRemaining,
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
  };
}
