"use client";

import { useState } from "react";
import { Download, Trash2, Loader2, Mic } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ClientFile } from "@/lib/types";
import { FileTypeIcon } from "./FileTypeIcon";
import { CategoryBadge } from "./CategoryBadge";

interface ClientFilesTableProps {
  files: ClientFile[];
  onDeleted: (id: string) => void;
}

function formatBytes(bytes: number | null) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isAudioFile(file: ClientFile) {
  const ext = file.file_name.split(".").pop()?.toLowerCase();
  return (
    ext === "wav" ||
    ext === "mp3" ||
    file.file_type?.startsWith("audio/") ||
    file.category === "wave_recording"
  );
}

export function ClientFilesTable({ files, onDeleted }: ClientFilesTableProps) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDownload(file: ClientFile) {
    setDownloading(file.id);
    try {
      const res = await fetch(`/api/client-files/${file.id}/download`);
      if (!res.ok) throw new Error("Could not get download link");
      const { url } = await res.json();
      const a = document.createElement("a");
      a.href = url;
      a.download = file.file_name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch (err) {
      toast.error("Download failed. Please try again.");
      console.error(err);
    } finally {
      setDownloading(null);
    }
  }

  async function handleDelete(file: ClientFile) {
    if (!confirm(`Delete "${file.file_name}"? This cannot be undone.`)) return;
    setDeleting(file.id);
    try {
      const res = await fetch(`/api/client-files/${file.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success(`"${file.file_name}" deleted.`);
      onDeleted(file.id);
    } catch (err) {
      toast.error("Failed to delete file.");
      console.error(err);
    } finally {
      setDeleting(null);
    }
  }

  function handleTranscribe(file: ClientFile) {
    toast.info(`Transcription pipeline coming soon for "${file.file_name}".`);
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm font-medium text-muted-foreground">No files found</p>
        <p className="mt-1 text-xs text-muted-foreground">Upload files to get started</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[280px]">File Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Uploaded By</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <FileTypeIcon fileName={file.file_name} mimeType={file.file_type} />
                  <span className="truncate text-sm font-medium text-dc-navy max-w-[200px]" title={file.file_name}>
                    {file.file_name}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <CategoryBadge category={file.category} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatBytes(file.file_size)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {file.uploaded_by}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {formatDate(file.created_at)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[160px]">
                <span className="truncate block" title={file.notes ?? ""}>
                  {file.notes ?? "—"}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  {isAudioFile(file) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleTranscribe(file)}
                        >
                          <Mic className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Transcribe</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-dc-blue hover:text-dc-blue-dark hover:bg-dc-blue/10"
                        onClick={() => handleDownload(file)}
                        disabled={downloading === file.id}
                      >
                        {downloading === file.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(file)}
                        disabled={deleting === file.id}
                      >
                        {deleting === file.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    </TooltipProvider>
  );
}
