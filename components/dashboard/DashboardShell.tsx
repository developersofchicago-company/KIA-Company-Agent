"use client";

import { useState } from "react";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";

interface DashboardShellProps {
  userName?: string;
  userEmail?: string;
  userRole?: string;
  children: React.ReactNode;
}

export function DashboardShell({
  userName,
  userEmail,
  userRole,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-muted/40">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        userName={userName}
        userRole={userRole}
      />

      <div className="flex min-h-screen flex-col md:pl-64">
        <TopBar
          onMenuClick={() => setMobileOpen(true)}
          userName={userName}
          userEmail={userEmail}
        />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
