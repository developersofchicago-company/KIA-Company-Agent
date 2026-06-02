import { Files, FileAudio, HardDrive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ClientFile } from "@/lib/types";

interface StorageSummaryCardProps {
  files: ClientFile[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StorageSummaryCard({ files }: StorageSummaryCardProps) {
  const totalFiles = files.length;
  const waveFiles = files.filter((f) => f.category === "wave_recording").length;
  const otherFiles = totalFiles - waveFiles;
  const totalBytes = files.reduce((sum, f) => sum + (f.file_size ?? 0), 0);

  const stats = [
    { label: "Total Files", value: totalFiles, icon: Files, color: "text-dc-blue" },
    { label: "Wave Recordings", value: waveFiles, icon: FileAudio, color: "text-green-600" },
    { label: "Other Files", value: otherFiles, icon: Files, color: "text-purple-600" },
    { label: "Storage Used", value: formatBytes(totalBytes), icon: HardDrive, color: "text-orange-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 shrink-0 ${color}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="mt-1 text-xl font-bold text-dc-navy">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
