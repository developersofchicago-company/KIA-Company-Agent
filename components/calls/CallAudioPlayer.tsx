"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/format";

const SPEEDS = [0.5, 1, 1.5, 2];

interface Props {
  src: string | null | undefined;
  fallbackDurationSeconds?: number | null;
}

export function CallAudioPlayer({ src, fallbackDurationSeconds }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState<number>(fallbackDurationSeconds ?? 0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onLoaded = () => {
      if (Number.isFinite(a.duration)) setDuration(a.duration);
    };
    const onEnded = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnded);
    };
  }, [src]);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play();
      setPlaying(true);
    }
  }

  function onSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const a = audioRef.current;
    if (!a) return;
    const v = Number(e.target.value);
    a.currentTime = v;
    setCurrent(v);
  }

  function pickSpeed(v: number) {
    setSpeed(v);
    if (audioRef.current) audioRef.current.playbackRate = v;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-dc-navy">
          Recording
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {src ? (
          <>
            <audio ref={audioRef} src={src} preload="metadata" />

            <div className="flex items-center gap-4">
              <Button
                onClick={togglePlay}
                size="icon"
                className="h-12 w-12 rounded-full bg-dc-blue hover:bg-dc-blue-dark"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5" />
                )}
              </Button>
              <div className="flex-1 space-y-1.5">
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.1}
                  value={current}
                  onChange={onSeek}
                  className="block w-full cursor-pointer accent-dc-blue"
                  aria-label="Seek"
                />
                <div className="flex justify-between text-xs font-mono text-muted-foreground">
                  <span>{formatDuration(Math.floor(current))}</span>
                  <span>{formatDuration(Math.floor(duration))}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => pickSpeed(s)}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      speed === s
                        ? "bg-dc-blue text-white"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
              <a
                href={src}
                download
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-dc-navy shadow-sm hover:bg-accent"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No recording available for this call.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
