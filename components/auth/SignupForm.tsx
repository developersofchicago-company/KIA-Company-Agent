"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, User } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { createBrowserSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
});

type SignupValues = z.infer<typeof schema>;

export function SignupForm() {
  const router = useRouter();
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "" },
  });

  async function onSubmit(values: SignupValues) {
    const supabase = createBrowserSupabase();

    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: {
        data: { full_name: values.fullName },
        shouldCreateUser: true,
      },
    });

    if (error) {
      toast.error(error.message || "Could not send verification code.");
      return;
    }

    setSent(true);
    toast.success("Check your email for the verification code!");
    router.push(`/verify?email=${encodeURIComponent(values.email)}`);
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5"
      aria-label="Sign up"
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
            disabled={isSubmitting || sent}
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? "name-error" : undefined}
            className={cn(
              "pl-9",
              errors.fullName && "border-destructive focus-visible:ring-destructive",
            )}
            {...register("fullName")}
          />
        </div>
        {errors.fullName && (
          <p id="name-error" className="text-xs text-destructive">
            {errors.fullName.message}
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
            disabled={isSubmitting || sent}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "signup-email-error" : undefined}
            className={cn(
              "pl-9",
              errors.email && "border-destructive focus-visible:ring-destructive",
            )}
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p id="signup-email-error" className="text-xs text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || sent}
        className="h-11 w-full bg-dc-blue text-white hover:bg-dc-blue-dark"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Sending code...
          </>
        ) : sent ? (
          "Code sent — check your email"
        ) : (
          "Send verification code"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-dc-blue hover:text-dc-blue-dark hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
