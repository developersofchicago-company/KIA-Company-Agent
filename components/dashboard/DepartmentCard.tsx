"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Clock, Phone, Tag, Languages } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VapiWebCall } from "@/components/shared/VapiWebCall";
import type { Department } from "@/lib/types";

interface DepartmentCardProps {
  department: Department;
  onEdit: (department: Department) => void;
  onDelete: (id: string) => void;
}

export function DepartmentCard({ department, onEdit, onDelete }: DepartmentCardProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete agent "${department.name}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/departments/${department.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(`"${department.name}" deleted`);
      onDelete(department.id);
    } catch {
      toast.error("Failed to delete agent");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base text-dc-navy">{department.name}</CardTitle>
            <Badge variant={department.is_active ? "default" : "secondary"} className="text-xs">
              {department.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(department)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {(department.hours_start || department.hours_end) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{department.hours_start ?? "—"} – {department.hours_end ?? "—"}</span>
          </div>
        )}

        {department.vapi_assistant_number && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{department.vapi_assistant_number}</span>
          </div>
        )}

        {!department.vapi_assistant_number && department.phone_numbers?.length > 0 && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{department.phone_numbers.join(", ")}</span>
          </div>
        )}

        {department.languages?.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Languages className="h-3.5 w-3.5 shrink-0" />
            <span className="capitalize">{department.languages.join(", ")}</span>
          </div>
        )}

        {department.routing_keywords && department.routing_keywords.length > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <Tag className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {department.routing_keywords.map((kw) => (
                <Badge key={kw} variant="outline" className="text-xs px-1.5 py-0">
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          {department.vapi_assistant_id ? (
            <VapiWebCall
              assistantId={department.vapi_assistant_id}
              label={`Talk to ${department.name} AI`}
              className="w-full justify-center"
            />
          ) : (
            <p className="text-xs text-center text-muted-foreground py-1">No assistant ID configured</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
