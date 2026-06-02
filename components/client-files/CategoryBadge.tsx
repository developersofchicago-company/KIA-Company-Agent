import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ClientFileCategory } from "@/lib/types";

const CATEGORY_CONFIG: Record<ClientFileCategory, { label: string; className: string }> = {
  wave_recording: { label: "Wave Recording", className: "bg-green-100 text-green-800 border-green-200" },
  sales_report:   { label: "Sales Report",   className: "bg-blue-100 text-blue-800 border-blue-200" },
  training:       { label: "Training",        className: "bg-purple-100 text-purple-800 border-purple-200" },
  call_log:       { label: "Call Log",        className: "bg-orange-100 text-orange-800 border-orange-200" },
  other:          { label: "Other",           className: "bg-gray-100 text-gray-700 border-gray-200" },
};

export function CategoryBadge({ category }: { category: ClientFileCategory }) {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other;
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}
