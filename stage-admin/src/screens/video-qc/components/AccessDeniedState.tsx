"use client";

import { Card, CardContent } from "@/components/ui/card";

export function AccessDeniedState() {
  return (
    <div className="p-6">
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-destructive">
            You don&apos;t have permission to view this page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
