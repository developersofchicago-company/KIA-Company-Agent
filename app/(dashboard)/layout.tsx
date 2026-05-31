import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { createServerSupabase } from "@/lib/supabase-server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = user.email ?? "";
  const meta = (user.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    role?: string;
  };
  const userName =
    meta.full_name ?? meta.name ?? email.split("@")[0] ?? "DC User";
  const userRole = meta.role ?? "Member";

  return (
    <DashboardShell userName={userName} userEmail={email} userRole={userRole}>
      {children}
    </DashboardShell>
  );
}
