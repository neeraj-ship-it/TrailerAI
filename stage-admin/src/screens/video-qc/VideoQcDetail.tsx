"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useVideoQcDetailQuery,
  useVideoQcProgressQuery,
} from "@/service/modules/videoQc.api";
import { Issue, VideoQcStatusEnum } from "@/types/videoQc";
import { formatTimestamp } from "@/utils/helpers";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useRef } from "react";
import {
  AccessDeniedState,
  ErrorState,
  LoadingState,
  QcProgress,
  VideoQcForm,
} from "./components";

import { useVideoQcAccess } from "./hooks/useVideoQc";

const getStatusBadgeVariant = (status: VideoQcStatusEnum) => {
  switch (status) {
    case VideoQcStatusEnum.APPROVED:
      return "default";
    case VideoQcStatusEnum.PROCESSING:
      return "secondary";
    case VideoQcStatusEnum.FAILED:
      return "destructive";
    case VideoQcStatusEnum.PENDING:
    default:
      return "outline";
  }
};

const formatDateForDisplay = (date: Date | string): string => {
  try {
    const dateStr = typeof date === "string" ? date : date.toISOString();
    return formatTimestamp(dateStr);
  } catch {
    return "Invalid Date";
  }
};

export default function VideoQcDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const { hasReadAccess } = useVideoQcAccess();
  const queryClient = useQueryClient();
  const previousStatusRef = useRef<VideoQcStatusEnum | undefined>(undefined);

  const {
    data: videoQcDetail,
    isLoading: loading,
    error,
  } = useVideoQcDetailQuery(id, { enabled: !!id });

  const shouldPollProgress = useMemo(() => {
    if (!videoQcDetail) return false;

    return (
      videoQcDetail.status === VideoQcStatusEnum.PENDING ||
      videoQcDetail.status === VideoQcStatusEnum.PROCESSING
    );
  }, [videoQcDetail?.status]);

  const { data: progressData } = useVideoQcProgressQuery(
    videoQcDetail?.projectId,
    {
      enabled: shouldPollProgress && !!videoQcDetail?.projectId,
      onData: (data) => {
        if (data.qcStatus && previousStatusRef.current !== data.qcStatus) {
          const wasPolling =
            previousStatusRef.current === VideoQcStatusEnum.PENDING ||
            previousStatusRef.current === VideoQcStatusEnum.PROCESSING;
          const isStillPolling =
            data.qcStatus === VideoQcStatusEnum.PENDING ||
            data.qcStatus === VideoQcStatusEnum.PROCESSING;

          if (wasPolling && !isStillPolling) {
            queryClient.invalidateQueries({
              queryKey: ["videoQc", "list"],
            });
            queryClient.invalidateQueries({
              queryKey: ["videoQc", "detail"],
            });
          }

          previousStatusRef.current = data.qcStatus;
        }
      },
    }
  );

  if (!hasReadAccess) {
    return <AccessDeniedState />;
  }

  if (id && error) {
    return <ErrorState />;
  }

  if (id && loading) {
    return <LoadingState />;
  }

  if (id && !videoQcDetail) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-destructive">
              Video QC item not found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatTime = (timeString: string) => {
    const parts = timeString.split(":");
    if (parts.length === 2) {
      const [mins, secs] = parts;
      return `${mins}m ${secs}s`;
    }
    return timeString;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  if (id && videoQcDetail) {
    const detailFields = [
      {
        label: "ID",
        value: videoQcDetail.id,
        className: "font-mono text-xs",
      },
      {
        label: "Raw Media ID",
        value: videoQcDetail.rawMediaId || "-",
        className: "font-mono text-xs",
      },
      {
        label: "Status",
        render: () => (
          <Badge variant={getStatusBadgeVariant(videoQcDetail.status)}>
            {videoQcDetail.status}
          </Badge>
        ),
      },
      {
        label: "No. of Attempts",
        value: videoQcDetail.noOfAttempts,
      },
      {
        label: "Created At",
        value: formatDateForDisplay(videoQcDetail.createdAt),
        className: "text-sm",
      },
      {
        label: "Updated At",
        value: formatDateForDisplay(videoQcDetail.updatedAt),
        className: "text-sm",
      },
    ];

    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/video-qc")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <CardTitle className="text-2xl">Video QC Details</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <VideoQcForm
                initialValues={{ projectId: videoQcDetail.projectId }}
                isEditMode={true}
              />
              {progressData &&
                (progressData.qcStatus === VideoQcStatusEnum.PENDING ||
                  progressData.qcStatus === VideoQcStatusEnum.PROCESSING) && (
                  <QcProgress
                    progress={progressData.qcProgress}
                    progressType={progressData.qcProgressType}
                    status={progressData.qcStatus}
                  />
                )}
              <div className="grid grid-cols-2 gap-6 pt-6 border-t">
                {detailFields.map((field) => (
                  <div key={field.label}>
                    <label className="text-sm font-medium text-muted-foreground">
                      {field.label}
                    </label>
                    {field.render ? (
                      <div className="mt-1">{field.render()}</div>
                    ) : (
                      <p className={`mt-1 ${field.className || ""}`}>
                        {field.value}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {videoQcDetail.issues && videoQcDetail.issues.length > 0 && (
                <div className="pt-6 border-t space-y-4">
                  <h3 className="text-lg font-semibold">Issues</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {videoQcDetail.issues.map((issue: Issue, index: number) => (
                      <div
                        key={index}
                        className="p-3 border rounded-md bg-muted/50"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            {issue.category}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(issue.start_minutes)} -{" "}
                            {formatTime(issue.end_minutes)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Duration: {formatDuration(issue.duration)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {videoQcDetail.history && videoQcDetail.history.length > 0 && (
                <div className="pt-6 border-t space-y-4">
                  <h3 className="text-lg font-semibold">History</h3>
                  <div className="space-y-3">
                    {videoQcDetail.history.map((historyItem, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-md space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <Badge
                            variant={getStatusBadgeVariant(historyItem.status)}
                          >
                            {historyItem.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDateForDisplay(historyItem.createdAt)}
                          </span>
                        </div>
                        {historyItem.rawMediaId && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              Raw Media ID:{" "}
                            </span>
                            <span className="font-mono text-xs">
                              {historyItem.rawMediaId}
                            </span>
                          </div>
                        )}
                        {historyItem.issues &&
                          historyItem.issues.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <div className="text-xs font-medium text-muted-foreground">
                                Issues ({historyItem.issues.length}):
                              </div>
                              <div className="space-y-1">
                                {historyItem.issues.map(
                                  (issue: Issue, idx: number) => (
                                    <div
                                      key={idx}
                                      className="text-xs p-2 bg-muted/30 rounded"
                                    >
                                      <span className="font-medium">
                                        {issue.category}
                                      </span>
                                      <span className="text-muted-foreground ml-2">
                                        {formatTime(issue.start_minutes)} -{" "}
                                        {formatTime(issue.end_minutes)}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/video-qc")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <CardTitle className="text-2xl">Create Video QC</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <VideoQcForm />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
