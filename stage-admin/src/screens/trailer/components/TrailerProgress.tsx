"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { TrailerStatusEnum, TrailerStatusTypeEnum } from "@/types/trailer";

interface TrailerProgressProps {
  progress: number;
  statusType: TrailerStatusTypeEnum;
  status: TrailerStatusEnum;
}

const formatStatusType = (type: TrailerStatusTypeEnum): string => {
  switch (type) {
    case TrailerStatusTypeEnum.CREATED:
      return "Initializing";
    case TrailerStatusTypeEnum.ANALYZING:
      return "Analyzing Video";
    case TrailerStatusTypeEnum.GENERATING:
      return "Generating Trailer";
    case TrailerStatusTypeEnum.RENDERING:
      return "Rendering";
    case TrailerStatusTypeEnum.FINALIZING:
      return "Finalizing";
    case TrailerStatusTypeEnum.COMPLETED:
      return "Completed";
    case TrailerStatusTypeEnum.FAILED:
      return "Failed";
    default:
      return type;
  }
};

export function TrailerProgress({
  progress,
  statusType,
  status,
}: TrailerProgressProps) {
  const isIdle = status === TrailerStatusEnum.IDLE;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {formatStatusType(statusType)}
          </span>
          {!isIdle && (
            <span className="text-sm text-muted-foreground">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
        {isIdle ? (
          <div className="flex items-center gap-3 py-2">
            <Clock className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Queued</span>
          </div>
        ) : (
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
