"use client";

import { RefreshCw } from "lucide-react";

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Loading video QC data...</p>
      </div>
    </div>
  );
}
