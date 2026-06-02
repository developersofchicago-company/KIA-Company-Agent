"use client";

import { useCallback, useEffect, useState } from "react";
import { Upload, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StorageSummaryCard } from "@/components/client-files/StorageSummaryCard";
import { ClientFilesTable } from "@/components/client-files/ClientFilesTable";
import { UploadFileModal } from "@/components/client-files/UploadFileModal";
import type { ClientFile } from "@/lib/types";

const CATEGORIES = [
  { value: "all",            label: "All Categories" },
  { value: "wave_recording", label: "Wave Call Recordings" },
  { value: "sales_report",   label: "Sales Reports" },
  { value: "training",       label: "Training Documents" },
  { value: "call_log",       label: "Call Logs" },
  { value: "other",          label: "Other" },
];

const SORT_OPTIONS = [
  { value: "created_at|desc", label: "Newest First" },
  { value: "created_at|asc",  label: "Oldest First" },
  { value: "file_name|asc",   label: "Name A–Z" },
  { value: "file_name|desc",  label: "Name Z–A" },
  { value: "file_size|desc",  label: "Largest First" },
  { value: "file_size|asc",   label: "Smallest First" },
];

function formatStorageUsed(files: ClientFile[]) {
  const bytes = files.reduce((sum, f) => sum + (f.file_size ?? 0), 0);
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function ClientFilesPage() {
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("created_at|desc");

  const [uploadOpen, setUploadOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const [sortField, sortOrder] = sort.split("|");
      const params = new URLSearchParams({
        page: String(page),
        search,
        category,
        sort: sortField,
        order: sortOrder,
      });
      const res = await fetch(`/api/client-files?${params}`);
      if (!res.ok) throw new Error("Failed to load files");
      const data = await res.json();
      setFiles(data.files ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      toast.error("Could not load files.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, category, sort]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function handleCategoryChange(val: string) {
    setPage(1);
    setCategory(val);
  }

  function handleSortChange(val: string) {
    setPage(1);
    setSort(val);
  }

  function handleDeleted(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setTotal((prev) => prev - 1);
  }

  const storageUsed = formatStorageUsed(files);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-dc-navy">Client Files</h1>
          <p className="text-sm text-muted-foreground">Files shared by KIA Motors Karachi</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Used: {storageUsed} of 1 TB
          </span>
          <Button
            onClick={() => setUploadOpen(true)}
            className="bg-dc-blue hover:bg-dc-blue-dark text-white"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Storage summary */}
      <StorageSummaryCard files={files} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search files…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8 w-52"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>

        <Select value={category} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={handleSortChange}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-sm text-muted-foreground">
          {loading ? "Loading…" : `${total.toLocaleString()} file${total !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-dc-blue border-t-transparent" />
        </div>
      ) : (
        <ClientFilesTable files={files} onDeleted={handleDeleted} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <UploadFileModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={fetchFiles}
      />
    </div>
  );
}
