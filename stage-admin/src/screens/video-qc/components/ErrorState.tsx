"use client";

import { Card, CardContent } from "@/components/ui/card";

interface ErrorStateProps {
  message?: string;
}

export function ErrorState({
  message = "Error loading video QC data. Please try again.",
}: ErrorStateProps) {
  return (
    <div className="p-6">
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-destructive">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}
