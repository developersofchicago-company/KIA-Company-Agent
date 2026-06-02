"use client";

import { usePathname } from "next/navigation";
import { Bell, LogOut, Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TITLES: Record<string, string> = {
  "/client-files": "Client Files",
};

function titleFor(pathname: string): string {
  for (const [prefix, title] of Object.entries(TITLES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return title;
  }
  return "Client Files";
}

interface TopBarProps {
  onMenuClick: () => void;
  userName?: string;
  userEmail?: string;
  hasNotifications?: boolean;
}

export function TopBar({
  onMenuClick,
  userName = "DC User",
  userEmail = "you@example.com",
  hasNotifications = true,
}: TopBarProps) {
  const pathname = usePathname();

  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-white/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/75 md:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <h1 className="text-lg font-semibold text-dc-navy">
        {titleFor(pathname)}
      </h1>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {hasNotifications && (
            <span
              className={cn(
                "absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-white",
              )}
              aria-hidden="true"
            />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 gap-2 px-2 hover:bg-dc-blue/10"
              aria-label="Account menu"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-dc-blue text-white text-xs font-semibold">
                  {initials || "DC"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-dc-navy">
                  {userName}
                </span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {userEmail}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => {
                const f = document.createElement("form");
                f.method = "POST";
                f.action = "/api/auth/logout";
                document.body.appendChild(f);
                f.submit();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
