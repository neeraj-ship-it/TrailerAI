"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useClipExtractorDetail,
  useClipExtractorStatus,
  useStartClipExtraction,
} from "@/service/modules/clip-extractor.api";
import {
  ClipExtractorStatusEnum,
  CLIP_EXTRACTOR_TERMINAL_STATUSES,
} from "@/types/clip-extractor";
import { formatTimestamp } from "@/utils/helpers";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock,
  Download,
  Film,
  Play,
  RefreshCw,
  Scissors,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  AccessDeniedState,
  ClipCard,
  ErrorState,
  LoadingState,
} from "./components";
import { useClipExtractorAccess } from "./hooks/useClipExtractor";

const getStatusColor = (status?: string) => {
  switch (status) {
    case ClipExtractorStatusEnum.COMPLETED:
      return "bg-green-500/10 text-green-700 border-green-500/30";
    case ClipExtractorStatusEnum.PROCESSING:
      return "bg-blue-500/10 text-blue-700 border-blue-500/30 animate-pulse";
    case ClipExtractorStatusEnum.FAILED:
      return "bg-red-500/10 text-red-700 border-red-500/30";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-500/30";
  }
};

const formatDate = (date: string | undefined): string => {
  if (!date) return "-";
  try {
    return formatTimestamp(date);
  } catch {
    return "-";
  }
};

export default function ClipExtractorDetail() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;
  const queryClient = useQueryClient();
  const previousStatusRef = useRef<string | undefined>(undefined);

  const { hasReadAccess, hasWriteAccess } = useClipExtractorAccess();
  const startMutation = useStartClipExtraction();

  const {
    data: detail,
    isLoading: loading,
    error,
  } = useClipExtractorDetail(projectId);

  const shouldPoll = useMemo(() => {
    if (!detail) return false;
    return !CLIP_EXTRACTOR_TERMINAL_STATUSES.includes(
      detail.status as ClipExtractorStatusEnum
    );
  }, [detail]);

  const { data: statusData } = useClipExtractorStatus(projectId, shouldPoll);

  // Refresh detail when status reaches terminal state
  const currentStatus = statusData?.status || detail?.status;
  if (
    currentStatus &&
    previousStatusRef.current !== currentStatus &&
    CLIP_EXTRACTOR_TERMINAL_STATUSES.includes(
      currentStatus as ClipExtractorStatusEnum
    ) &&
    previousStatusRef.current &&
    !CLIP_EXTRACTOR_TERMINAL_STATUSES.includes(
      previousStatusRef.current as ClipExtractorStatusEnum
    )
  ) {
    queryClient.invalidateQueries({
      queryKey: ["clip-extractor", "detail", projectId],
    });
  }
  previousStatusRef.current = currentStatus;

  const handleRetryExtraction = async () => {
    try {
      await startMutation.mutateAsync(projectId);
      toast.success("Extraction restarted!");
      queryClient.invalidateQueries({
        queryKey: ["clip-extractor", "detail", projectId],
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to restart extraction");
    }
  };

  if (!hasReadAccess) return <AccessDeniedState />;
  if (error) return <ErrorState message="Error loading project details." />;
  if (loading) return <LoadingState />;
  if (!detail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-12 text-center">
            <p className="text-xl text-red-600 font-semibold">
              Project not found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const effectiveStatus =
    statusData?.status || detail.status || ClipExtractorStatusEnum.IDLE;
  const effectiveProgress = statusData?.progress ?? detail.progress ?? 0;
  const effectiveStage = statusData?.progressStage || detail.progressStage;
  const isProcessing = effectiveStatus === ClipExtractorStatusEnum.PROCESSING;
  const isCompleted = effectiveStatus === ClipExtractorStatusEnum.COMPLETED;
  const isFailed = effectiveStatus === ClipExtractorStatusEnum.FAILED;
  const isIdle = effectiveStatus === ClipExtractorStatusEnum.IDLE;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Card */}
        <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => router.push("/clip-extractor")}
                  className="text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back
                </Button>
                <div>
                  <CardTitle className="text-3xl font-bold">
                    {detail.contentMetadata?.title || "Clip Extraction Project"}
                  </CardTitle>
                  <p className="text-white/70 font-mono text-sm mt-1">
                    {detail.projectId}
                  </p>
                </div>
              </div>
              <Badge
                className={`${getStatusColor(effectiveStatus)} border text-base px-4 py-2`}
              >
                {effectiveStatus}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {/* Progress Bar */}
            {isProcessing && (
              <div className="mb-8 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    {effectiveStage || "Processing"}
                  </span>
                  <span className="text-lg font-bold text-teal-600">
                    {effectiveProgress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 h-4 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${effectiveProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Extraction in progress... Please wait.
                </p>
              </div>
            )}

            {/* Error Display */}
            {isFailed && detail.error && (
              <div className="mb-8 bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <p className="text-red-700 font-medium">{detail.error}</p>
                {hasWriteAccess && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
                    onClick={handleRetryExtraction}
                    disabled={startMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry Extraction
                  </Button>
                )}
              </div>
            )}

            {/* Start Extraction for Idle projects */}
            {isIdle && hasWriteAccess && (
              <div className="mb-8 bg-amber-50 border-2 border-amber-200 rounded-xl p-6 text-center">
                <Scissors className="h-10 w-10 text-amber-600 mx-auto mb-3" />
                <p className="text-amber-800 font-medium mb-4">
                  Extraction has not started yet.
                </p>
                <Button
                  onClick={handleRetryExtraction}
                  disabled={startMutation.isPending}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600"
                >
                  {startMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Extraction
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Detail Fields */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  Content Slug
                </label>
                <p className="mt-2 text-gray-900">
                  {detail.contentSlug || "-"}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  Genre
                </label>
                <p className="mt-2 text-gray-900 capitalize">
                  {detail.contentMetadata?.genre || "-"}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  Language
                </label>
                <p className="mt-2 text-gray-900">
                  {detail.contentMetadata?.language || "-"}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  Created
                </label>
                <p className="mt-2 text-gray-900 text-sm flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(detail.createdAt)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  Started
                </label>
                <p className="mt-2 text-gray-900 text-sm">
                  {formatDate(detail.startedAt)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  Completed
                </label>
                <p className="mt-2 text-gray-900 text-sm">
                  {formatDate(detail.completedAt)}
                </p>
              </div>
            </div>

            {/* Video URL */}
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Source Video URL
              </label>
              <p className="mt-2 text-gray-900 font-mono text-sm break-all">
                {detail.videoUrl}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Compiled Video */}
        {isCompleted && detail.compiledVideoUrl && (
          <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <Film className="h-6 w-6 text-teal-600" />
                Compiled Best Clips Video
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-black rounded-xl overflow-hidden">
                <video
                  src={detail.compiledVideoUrl}
                  controls
                  className="w-full max-h-[500px] object-contain"
                  preload="metadata"
                />
              </div>
              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(detail.compiledVideoUrl, "_blank")
                  }
                  className="hover:bg-teal-50 hover:border-teal-300"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Compiled Video
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Extraction Report */}
        {isCompleted && detail.extractionReportUrl && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                window.open(detail.extractionReportUrl, "_blank")
              }
              className="hover:bg-teal-50 hover:border-teal-300"
            >
              <Download className="h-5 w-5 mr-2" />
              Download Extraction Report (JSON)
            </Button>
          </div>
        )}

        {/* Individual Clips */}
        {detail.clips && detail.clips.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Scissors className="h-8 w-8 text-teal-600" />
              Extracted Clips ({detail.clips.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {detail.clips.map((clip, idx) => (
                <ClipCard key={clip.clipId} clip={clip} index={idx} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
