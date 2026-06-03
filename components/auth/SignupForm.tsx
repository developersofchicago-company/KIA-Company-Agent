"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, Mail, Sparkles, User, Check, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { createBrowserSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const magicLinkSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
});

const passwordSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

type MagicLinkValues = z.infer<typeof magicLinkSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export function SignupForm() {
  const router = useRouter();
  const [usePassword, setUsePassword] = useState(false);

  const {
    register: registerMagicLink,
    handleSubmit: handleSubmitMagicLink,
    formState: { errors: magicLinkErrors, isSubmitting: isSubmittingMagicLink },
  } = useForm<MagicLinkValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { fullName: "", email: "" },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    watch: watchPassword,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const passwordValue = watchPassword("password");

  const passwordRequirements = [
    { label: "At least 8 characters", met: passwordValue?.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(passwordValue || "") },
    { label: "One lowercase letter", met: /[a-z]/.test(passwordValue || "") },
    { label: "One number", met: /[0-9]/.test(passwordValue || "") },
    { label: "One special character", met: /[^A-Za-z0-9]/.test(passwordValue || "") },
  ];

  async function onMagicLinkSubmit(values: MagicLinkValues) {
    const supabase = createBrowserSupabase();

    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: {
        data: { full_name: values.fullName },
        shouldCreateUser: true,
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

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?type=email_confirmation`,
      },
    });

    if (error) {
      toast.error(error.message || "Could not create account.");
      return;
    }

    // Email confirmation is required - don't log the user in yet
    toast.success("Account created! Please check your email and click the confirmation link to verify your account.");
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
          aria-label="Sign up with password"
        >
          <div className="space-y-2">
            <Label htmlFor="password-fullName">Full Name</Label>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="password-fullName"
                type="text"
                autoComplete="name"
                placeholder="Your full name"
                disabled={isSubmittingPassword}
                aria-invalid={!!passwordErrors.fullName}
                aria-describedby={passwordErrors.fullName ? "password-name-error" : undefined}
                className={cn(
                  "pl-9",
                  passwordErrors.fullName && "border-destructive focus-visible:ring-destructive",
                )}
                {...registerPassword("fullName")}
              />
            </div>
            {passwordErrors.fullName && (
              <p id="password-name-error" className="text-xs text-destructive">
                {passwordErrors.fullName.message}
              </p>
            )}
          </div>

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
            <Label htmlFor="signup-password">Password</Label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                disabled={isSubmittingPassword}
                aria-invalid={!!passwordErrors.password}
                aria-describedby={passwordErrors.password ? "signup-password-error" : undefined}
                className={cn(
                  "pl-9",
                  passwordErrors.password && "border-destructive focus-visible:ring-destructive",
                )}
                {...registerPassword("password")}
              />
            </div>
            {passwordErrors.password && (
              <p id="signup-password-error" className="text-xs text-destructive">
                {passwordErrors.password.message}
              </p>
            )}

            {/* Password Requirements */}
            <div className="space-y-1 pt-1">
              {passwordRequirements.map((req) => (
                <div key={req.label} className="flex items-center gap-2 text-xs">
                  {req.met ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={req.met ? "text-green-600" : "text-muted-foreground"}>
                    {req.label}
                  </span>
                </div>
              ))}
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
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>
      ) : (
        <form
          onSubmit={handleSubmitMagicLink(onMagicLinkSubmit)}
          noValidate
          className="space-y-5"
          aria-label="Sign up with magic link"
        >
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="Your full name"
                disabled={isSubmittingMagicLink}
                aria-invalid={!!magicLinkErrors.fullName}
                aria-describedby={magicLinkErrors.fullName ? "name-error" : undefined}
                className={cn(
                  "pl-9",
                  magicLinkErrors.fullName && "border-destructive focus-visible:ring-destructive",
                )}
                {...registerMagicLink("fullName")}
              />
            </div>
            {magicLinkErrors.fullName && (
              <p id="name-error" className="text-xs text-destructive">
                {magicLinkErrors.fullName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@company.com"
                disabled={isSubmittingMagicLink}
                aria-invalid={!!magicLinkErrors.email}
                aria-describedby={magicLinkErrors.email ? "signup-email-error" : undefined}
                className={cn(
                  "pl-9",
                  magicLinkErrors.email && "border-destructive focus-visible:ring-destructive",
                )}
                {...registerMagicLink("email")}
              />
            </div>
            {magicLinkErrors.email && (
              <p id="signup-email-error" className="text-xs text-destructive">
                {magicLinkErrors.email.message}
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            We&apos;ll send a magic link to your email
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
                Send magic link
              </>
            )}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-dc-blue hover:text-dc-blue-dark hover:underline"
        >
          Login
        </Link>
      </p>
    </div>
  );
}
