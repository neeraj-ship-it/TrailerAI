import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { QcProgressTypeEnum, VideoQcStatusEnum } from "@/types/videoQc";

interface QcProgressProps {
  progress: number;
  progressType: QcProgressTypeEnum;
  status: VideoQcStatusEnum;
}

const formatProgressType = (type: QcProgressTypeEnum): string => {
  switch (type) {
    case QcProgressTypeEnum.AUDIO_PROCESSING:
      return "Audio Processing";
    case QcProgressTypeEnum.VIDEO_PROCESSING:
      return "Video Processing";
    case QcProgressTypeEnum.COMPRESS:
      return "Compressing";
    case QcProgressTypeEnum.DOWNLOAD:
      return "Downloading";
    default:
      return type;
  }
};

export function QcProgress({
  progress,
  progressType,
  status,
}: QcProgressProps) {
  const isPending = status === VideoQcStatusEnum.PENDING;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {formatProgressType(progressType)}
          </span>
          {!isPending && (
            <span className="text-sm text-muted-foreground">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
        {isPending ? (
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
