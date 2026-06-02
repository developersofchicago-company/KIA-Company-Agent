import { FileAudio, FileSpreadsheet, FileText, FileArchive, FileImage, File } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileTypeIconProps {
  fileName: string;
  mimeType?: string | null;
  className?: string;
}

export function FileTypeIcon({ fileName, mimeType, className }: FileTypeIconProps) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "wav" || ext === "mp3" || mimeType?.startsWith("audio/")) {
    return <FileAudio className={cn("h-5 w-5 text-green-500", className)} />;
  }
  if (ext === "pdf" || mimeType === "application/pdf") {
    return <FileText className={cn("h-5 w-5 text-red-500", className)} />;
  }
  if (["xlsx", "xls", "csv"].includes(ext)) {
    return <FileSpreadsheet className={cn("h-5 w-5 text-emerald-600", className)} />;
  }
  if (["docx", "doc"].includes(ext) || mimeType?.includes("word")) {
    return <FileText className={cn("h-5 w-5 text-blue-500", className)} />;
  }
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext) || mimeType?.startsWith("image/")) {
    return <FileImage className={cn("h-5 w-5 text-pink-500", className)} />;
  }
  if (ext === "zip" || ext === "rar" || ext === "gz" || mimeType?.includes("zip")) {
    return <FileArchive className={cn("h-5 w-5 text-yellow-500", className)} />;
  }
  return <File className={cn("h-5 w-5 text-muted-foreground", className)} />;
}
