"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createBrowserSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CODE_LENGTH = 6;

export function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, value: string) {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);

    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    const focusIdx = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  }

  async function handleVerify() {
    const code = digits.join("");
    if (code.length < CODE_LENGTH) {
      toast.error("Please enter the full 6-digit code.");
      return;
    }
    if (!email) {
      toast.error("Email is missing. Please go back to sign up.");
      return;
    }

    setVerifying(true);
    const supabase = createBrowserSupabase();

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    setVerifying(false);

    if (error) {
      toast.error(error.message || "Invalid code. Please try again.");
      return;
    }

    toast.success("Account verified! Welcome.");
    router.push("/client-files");
    router.refresh();
  }

  async function handleResend() {
    if (!email) return;
    setResending(true);
    const supabase = createBrowserSupabase();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    setResending(false);

    if (error) {
      toast.error(error.message || "Could not resend code.");
      return;
    }
    toast.success("New code sent! Check your email.");
    setDigits(Array(CODE_LENGTH).fill(""));
    inputRefs.current[0]?.focus();
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to
        </p>
        <p className="mt-1 font-medium text-dc-navy">{email || "your email"}</p>
      </div>

      <div className="space-y-2">
        <Label>Verification Code</Label>
        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <Input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="h-12 w-12 text-center text-lg font-semibold"
              autoFocus={i === 0}
            />
          ))}
        </div>
      </div>

      <Button
        onClick={handleVerify}
        disabled={verifying || digits.join("").length < CODE_LENGTH}
        className="h-11 w-full bg-dc-blue text-white hover:bg-dc-blue-dark"
      >
        {verifying ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          "Verify & Continue"
        )}
      </Button>

      <div className="flex flex-col items-center gap-2 text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="font-medium text-dc-blue hover:text-dc-blue-dark hover:underline disabled:opacity-50"
        >
          {resending ? "Sending..." : "Resend code"}
        </button>
        <Link
          href="/signup"
          className="text-muted-foreground hover:text-dc-navy hover:underline"
        >
          Use a different email
        </Link>
      </div>
    </div>
  );
}
