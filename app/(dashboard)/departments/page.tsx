"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DepartmentCard } from "@/components/dashboard/DepartmentCard";
import { DepartmentDialog } from "@/components/dashboard/DepartmentDialog";
import type { Department } from "@/lib/types";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/departments");
      if (!res.ok) throw new Error("Failed to load departments");
      setDepartments(await res.json());
    } catch {
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleSaved = (dept: Department) => {
    setDepartments((prev) => {
      const idx = prev.findIndex((d) => d.id === dept.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = dept;
        return next;
      }
      return [...prev, dept];
    });
  };

  const handleDelete = (id: string) => {
    setDepartments((prev) => prev.filter((d) => d.id !== id));
  };

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-dc-navy">Agents</h1>
          <p className="text-muted-foreground mt-1">
            Configure AI agents, routing keywords, and hours. Each card lets you demo the agent live.
          </p>
        </div>
        <Button onClick={openAdd} className="bg-dc-blue hover:bg-dc-blue-dark text-white gap-2">
          <Plus className="h-4 w-4" /> Add Agent
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-dc-blue" />
        </div>
      ) : departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Building2 className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No agents yet.</p>
          <Button onClick={openAdd} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Add your first agent
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <DepartmentCard
              key={dept.id}
              department={dept}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <DepartmentDialog
        open={dialogOpen}
        department={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
