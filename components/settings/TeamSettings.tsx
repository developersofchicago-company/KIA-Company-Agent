"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Member {
  id: string;
  user_id: string;
  email: string | null;
  role: string;
  created_at: string;
}

const ROLES = ["admin", "manager", "viewer"];

export function TeamSettings() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team");
      if (res.ok) setMembers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const invite = async () => {
    if (!email.trim()) return toast.error("Email is required");
    setInviting(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Invite failed");
      toast.success(`Invited ${email}`);
      setEmail("");
      fetchAll();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (id: string, newRole: string) => {
    try {
      const res = await fetch(`/api/team/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      toast.success("Role updated");
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, role: newRole } : m)),
      );
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const remove = async (id: string, label: string) => {
    if (!confirm(`Remove ${label} from the team?`)) return;
    try {
      const res = await fetch(`/api/team/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove");
      toast.success("Member removed");
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-dc-navy">Team Members</h2>
        <p className="text-sm text-muted-foreground">
          Invite teammates and manage their access level.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-dc-navy">
            <Users className="h-5 w-5 text-dc-blue" />
            Members
          </CardTitle>
          <CardDescription>
            Admins manage everything; managers handle calls; viewers read only.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-4">
          {/* Invite row */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={invite}
              disabled={inviting}
              className="bg-dc-blue text-white hover:bg-dc-blue-dark"
            >
              {inviting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Invite
            </Button>
          </div>

          <Separator />

          {/* Members list */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-dc-blue" />
            </div>
          ) : members.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No team members yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => {
                const label = m.email ?? m.user_id.slice(0, 8);
                const initials = (m.email ?? "U")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 rounded-lg border border-border/60 p-3"
                  >
                    <Avatar className="h-9 w-9 bg-dc-blue/10">
                      <AvatarFallback className="bg-dc-blue/10 text-dc-blue text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-sm text-dc-navy">
                      {label}
                    </span>
                    <Select
                      value={m.role}
                      onValueChange={(v) => changeRole(m.id, v)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r} className="capitalize">
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => remove(m.id, label)}
                      aria-label="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
