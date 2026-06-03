"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { createBrowserSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const magicLinkSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
});

const passwordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type MagicLinkValues = z.infer<typeof magicLinkSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export function LoginForm() {
  const router = useRouter();
  const [usePassword, setUsePassword] = useState(false);

  const {
    register: registerMagicLink,
    handleSubmit: handleSubmitMagicLink,
    formState: { errors: magicLinkErrors, isSubmitting: isSubmittingMagicLink },
  } = useForm<MagicLinkValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: "" },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onMagicLinkSubmit(values: MagicLinkValues) {
    const supabase = createBrowserSupabase();

    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message || "Could not send magic link.");
      return;
    }

    toast.success("Check your email for the magic link!");
  }

  async function onPasswordSubmit(values: PasswordValues) {
    const supabase = createBrowserSupabase();

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toast.error(error.message || "Invalid email or password.");
      return;
    }

    router.push("/client-files");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Toggle */}
      <div className="flex rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setUsePassword(false)}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all",
            !usePassword
              ? "bg-white text-dc-navy shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Sparkles className="mr-1 inline h-4 w-4" />
          Magic Link
        </button>
        <button
          type="button"
          onClick={() => setUsePassword(true)}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all",
            usePassword
              ? "bg-white text-dc-navy shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Lock className="mr-1 inline h-4 w-4" />
          Password
        </button>
      </div>

      {usePassword ? (
        <form
          onSubmit={handleSubmitPassword(onPasswordSubmit)}
          noValidate
          className="space-y-5"
          aria-label="Login with password"
        >
          <div className="space-y-2">
            <Label htmlFor="password-email">Email</Label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="password-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@company.com"
                disabled={isSubmittingPassword}
                aria-invalid={!!passwordErrors.email}
                aria-describedby={passwordErrors.email ? "password-email-error" : undefined}
                className={cn(
                  "pl-9",
                  passwordErrors.email && "border-destructive focus-visible:ring-destructive",
                )}
                {...registerPassword("email")}
              />
            </div>
            {passwordErrors.email && (
              <p id="password-email-error" className="text-xs text-destructive">
                {passwordErrors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={isSubmittingPassword}
                aria-invalid={!!passwordErrors.password}
                aria-describedby={passwordErrors.password ? "password-error" : undefined}
                className={cn(
                  "pl-9",
                  passwordErrors.password && "border-destructive focus-visible:ring-destructive",
                )}
                {...registerPassword("password")}
              />
            </div>
            {passwordErrors.password && (
              <p id="password-error" className="text-xs text-destructive">
                {passwordErrors.password.message}
              </p>
            )}
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-dc-blue hover:text-dc-blue-dark hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmittingPassword}
            className="h-11 w-full bg-dc-blue text-white hover:bg-dc-blue-dark"
          >
            {isSubmittingPassword ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Signing in...
              </>
            ) : (
              "Login with Password"
            )}
          </Button>
        </form>
      ) : (
        <form
          onSubmit={handleSubmitMagicLink(onMagicLinkSubmit)}
          noValidate
          className="space-y-5"
          aria-label="Login with magic link"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@company.com"
                disabled={isSubmittingMagicLink}
                aria-invalid={!!magicLinkErrors.email}
                aria-describedby={magicLinkErrors.email ? "email-error" : undefined}
                className={cn(
                  "pl-9",
                  magicLinkErrors.email && "border-destructive focus-visible:ring-destructive",
                )}
                {...registerMagicLink("email")}
              />
            </div>
            {magicLinkErrors.email && (
              <p id="email-error" className="text-xs text-destructive">
                {magicLinkErrors.email.message}
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            We&apos;ll send a magic link to your email to sign you in
          </p>

          <Button
            type="submit"
            disabled={isSubmittingMagicLink}
            className="h-11 w-full bg-dc-blue text-white hover:bg-dc-blue-dark"
          >
            {isSubmittingMagicLink ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Sending link...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                Login with Magic Link
              </>
            )}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-dc-blue hover:text-dc-blue-dark hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
