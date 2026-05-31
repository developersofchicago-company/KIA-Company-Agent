"use client";

import { usePathname, useRouter } from "next/navigation";
import { Phone } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  variant: "no-results" | "no-data";
}

export function CallsEmptyState({ variant }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  if (variant === "no-results") {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
        <Phone className="h-10 w-10 text-muted-foreground/60" aria-hidden="true" />
        <h2 className="mt-4 text-base font-semibold text-dc-navy">No calls found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your filters.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => router.push(pathname)}
        >
          Reset filters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
      <Phone className="h-10 w-10 text-muted-foreground/60" aria-hidden="true" />
      <h2 className="mt-4 text-base font-semibold text-dc-navy">No calls yet</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Once your AI receptionist starts receiving calls, they will appear here.
      </p>
      <a
        href="https://docs.vapi.ai/"
        target="_blank"
        rel="noreferrer"
        className="mt-3 text-sm font-medium text-dc-blue hover:text-dc-blue-dark hover:underline"
      >
        Read the setup guide →
      </a>
    </div>
  );
}
