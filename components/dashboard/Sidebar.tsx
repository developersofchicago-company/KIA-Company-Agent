"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Phone,
  PhoneCall,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Call History", href: "/calls", icon: Phone },
  { label: "Dialer", href: "/dialer", icon: PhoneCall },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Agents", href: "/departments", icon: Building2 },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  userName?: string;
  userRole?: string;
}

export function Sidebar({
  mobileOpen,
  onMobileClose,
  userName = "DC User",
  userRole = "Admin",
}: SidebarProps) {
  const pathname = usePathname();

  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-dc-navy/40 backdrop-blur-sm transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out",
          "md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Primary navigation"
      >
        {/* Logo + mobile close */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6">
          <Link
            href="/dashboard"
            onClick={onMobileClose}
            className="flex items-center"
          >
            <Logo size="md" variant="full" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMobileClose}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <Separator />

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onMobileClose}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-dc-blue text-white shadow-sm"
                        : "text-dc-navy hover:bg-dc-blue/10 hover:text-dc-blue-dark",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        active ? "text-white" : "text-dc-navy/70 group-hover:text-dc-blue-dark",
                      )}
                    />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <Separator />

        {/* User profile */}
        <div className="flex items-center gap-3 px-4 py-4">
          <Avatar className="h-10 w-10 bg-dc-blue/10">
            <AvatarFallback className="bg-dc-blue/10 text-dc-blue font-semibold">
              {initials || "DC"}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-dc-navy">
              {userName}
            </span>
            <span className="truncate text-xs text-muted-foreground capitalize">
              {userRole}
            </span>
          </div>
          <form action="/api/auth/logout" method="post">
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label="Log out"
              className="text-dc-navy/70 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </aside>
    </>
  );
}
