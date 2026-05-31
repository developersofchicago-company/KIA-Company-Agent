"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Vapi from "@vapi-ai/web";
import { Mic, MicOff, PhoneOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CallState = "idle" | "connecting" | "active" | "ending";

interface VapiWebCallProps {
  assistantId: string;
  label?: string;
  className?: string;
}

export function VapiWebCall({ assistantId, label = "Talk to AI", className }: VapiWebCallProps) {
  const vapiRef = useRef<Vapi | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) return;

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => setCallState("active"));
    vapi.on("call-end", () => {
      setCallState("idle");
      setIsMuted(false);
      setVolumeLevel(0);
    });
    vapi.on("volume-level", (level: number) => setVolumeLevel(level));
    vapi.on("error", () => setCallState("idle"));

    return () => {
      vapi.stop();
    };
  }, []);

  const startCall = useCallback(async () => {
    if (!vapiRef.current || callState !== "idle") return;
    setCallState("connecting");
    try {
      await vapiRef.current.start(assistantId);
    } catch {
      setCallState("idle");
    }
  }, [assistantId, callState]);

  const endCall = useCallback(() => {
    if (!vapiRef.current) return;
    setCallState("ending");
    vapiRef.current.stop();
  }, []);

  const toggleMute = useCallback(() => {
    if (!vapiRef.current) return;
    const next = !isMuted;
    vapiRef.current.setMuted(next);
    setIsMuted(next);
  }, [isMuted]);

  if (callState === "idle") {
    return (
      <Button
        onClick={startCall}
        className={cn("gap-2 bg-dc-blue hover:bg-dc-blue-dark text-white", className)}
      >
        <Mic className="h-4 w-4" />
        {label}
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {callState === "connecting" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-dc-blue" />
          Connecting…
        </div>
      )}

      {callState === "active" && (
        <>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200"
          >
            <span
              className="h-2 w-2 rounded-full bg-green-500"
              style={{ opacity: 0.5 + volumeLevel * 0.5 }}
            />
            Live
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleMute}
            className="gap-1.5"
          >
            {isMuted ? <MicOff className="h-4 w-4 text-destructive" /> : <Mic className="h-4 w-4" />}
            {isMuted ? "Unmute" : "Mute"}
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={endCall}
            className="gap-1.5"
          >
            <PhoneOff className="h-4 w-4" />
            End
          </Button>
        </>
      )}

      {callState === "ending" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Ending call…
        </div>
      )}
    </div>
  );
}
