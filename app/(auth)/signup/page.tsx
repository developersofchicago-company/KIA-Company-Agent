import { redirect } from "next/navigation";

import { Logo } from "@/components/shared/Logo";
import { SignupForm } from "@/components/auth/SignupForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createServerSupabase } from "@/lib/supabase-server";

export const metadata = {
  title: "Sign up — KIA Client Portal",
};

export default async function SignupPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/client-files");
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className="relative hidden w-1/2 overflow-hidden bg-dc-navy text-white lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-12"
        aria-hidden="true"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(51,133,255,0.35), transparent 55%), radial-gradient(circle at 80% 80%, rgba(0,102,255,0.25), transparent 60%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-dc-blue/30 blur-3xl" />
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-dc-blue-light/20 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <span
            className="text-7xl font-extrabold leading-none tracking-tight text-white"
            aria-hidden="true"
          >
            KIA
          </span>
          <span className="mt-3 text-sm font-medium uppercase tracking-[0.3em] text-white/70">
            Client Portal
          </span>
          <p className="mt-12 max-w-md text-2xl font-light leading-snug text-white/90">
            Secure file sharing. <span className="font-semibold text-white">Powered by DC.</span>
          </p>
        </div>
      </aside>

      <main className="flex w-full items-center justify-center px-4 py-12 sm:px-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo size="lg" variant="full" />
          </div>

          <Card className="border-border/60 shadow-xl shadow-dc-navy/5">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-dc-navy">
                Create your account
              </CardTitle>
              <CardDescription>
                Enter your email to receive a verification code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignupForm />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
