"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useTrailerDetailQuery,
  useTrailerStatusQuery,
} from "@/service/modules/trailer.api";
import {
  ShotSequenceItem,
  TERMINAL_STATUSES,
  TrailerStatusEnum,
  TrailerVariant,
} from "@/types/trailer";
import { formatTimestamp } from "@/utils/helpers";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileJson,
  FileText,
  Film,
  HardDrive,
  Layers,
  MessageSquare,
  Music,
  Sparkles,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  AccessDeniedState,
  ErrorState,
  LoadingState,
  TrailerForm,
  TrailerProgress,
} from "./components";
import { useTrailerAccess } from "./hooks/useTrailer";

const getStatusBadgeVariant = (status: TrailerStatusEnum) => {
  switch (status) {
    case TrailerStatusEnum.COMPLETED:
      return "default";
    case TrailerStatusEnum.PROCESSING:
      return "secondary";
    case TrailerStatusEnum.FAILED:
      return "destructive";
    case TrailerStatusEnum.IDLE:
    default:
      return "outline";
  }
};

const getStatusColor = (status: TrailerStatusEnum) => {
  switch (status) {
    case TrailerStatusEnum.COMPLETED:
      return "bg-green-500/10 text-green-700 border-green-500/30";
    case TrailerStatusEnum.PROCESSING:
      return "bg-blue-500/10 text-blue-700 border-blue-500/30 animate-pulse";
    case TrailerStatusEnum.FAILED:
      return "bg-red-500/10 text-red-700 border-red-500/30";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-500/30";
  }
};

const formatDateForDisplay = (date: Date | string | undefined): string => {
  if (!date) return "-";
  try {
    const dateStr = typeof date === "string" ? date : date.toISOString();
    return formatTimestamp(dateStr);
  } catch {
    return "Invalid Date";
  }
};

// Collapsible Variant Card Component
function VariantCard({ variant }: { variant: TrailerVariant }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const metadata = variant.metadata;

  return (
    <div className="border-2 rounded-2xl bg-gradient-to-br from-white to-gray-50 overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
      {/* Video Preview */}
      {variant.signedUrl && (
        <div className="bg-black">
          <video
            src={variant.signedUrl}
            controls
            className="w-full max-h-[500px] object-contain"
            preload="metadata"
          />
        </div>
      )}

      {/* Header - Always Visible */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg px-4 py-2 capitalize">
              {variant.style}
            </Badge>
            {variant.title && (
              <span className="font-bold text-xl text-gray-900">{variant.title}</span>
            )}
            {metadata?.production_ready && (
              <Badge className="bg-green-600 text-white border-0">
                <Sparkles className="h-4 w-4 mr-1" />
                Production Ready
              </Badge>
            )}
            {metadata?.character_intro_present && (
              <Badge variant="outline" className="border-purple-300 text-purple-700">Character Intro</Badge>
            )}
            {metadata?.hook_ending_present && (
              <Badge variant="outline" className="border-pink-300 text-pink-700">Hook Ending</Badge>
            )}
          </div>
          <div className="flex items-center gap-4">
            {variant.duration !== undefined && (
              <div className="flex items-center text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                <Clock className="h-4 w-4 mr-1.5" />
                {variant.duration.toFixed(1)}s
              </div>
            )}
            {variant.fileSize !== undefined && (
              <div className="flex items-center text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                <HardDrive className="h-4 w-4 mr-1.5" />
                {(variant.fileSize / 1024 / 1024).toFixed(1)} MB
              </div>
            )}
            {variant.confidence !== undefined && (
              <Badge variant="outline" className="text-base px-3 py-1">{variant.confidence}% confidence</Badge>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {metadata?.target_duration !== undefined && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <span className="text-xs text-blue-600 font-semibold">Target Duration</span>
              <p className="font-mono text-lg text-blue-900">{metadata.target_duration}s</p>
            </div>
          )}
          {metadata?.actual_duration !== undefined && (
            <div className="bg-green-50 p-3 rounded-lg">
              <span className="text-xs text-green-600 font-semibold">Actual Duration</span>
              <p className="font-mono text-lg text-green-900">{metadata.actual_duration}s</p>
            </div>
          )}
          {metadata?.suspense_peak !== undefined && (
            <div className="bg-purple-50 p-3 rounded-lg">
              <span className="text-xs text-purple-600 font-semibold">Suspense Peak</span>
              <p className="font-mono text-lg text-purple-900">{Math.round(metadata.suspense_peak * 100)}%</p>
            </div>
          )}
          {metadata?.structure?.hook_strength !== undefined && (
            <div className="bg-pink-50 p-3 rounded-lg">
              <span className="text-xs text-pink-600 font-semibold">Hook Strength</span>
              <p className="font-mono text-lg text-pink-900">{metadata.structure.hook_strength}%</p>
            </div>
          )}
        </div>

        {/* Opening Hook & Closing Tag */}
        {metadata?.opening_hook && (
          <p className="text-sm bg-indigo-50 p-3 rounded-lg mb-2 border border-indigo-200">
            <span className="font-bold text-indigo-700">Opening Hook:</span>{" "}
            <span className="text-indigo-900">{metadata.opening_hook}</span>
          </p>
        )}
        {metadata?.closing_tag && (
          <p className="text-sm bg-purple-50 p-3 rounded-lg mb-3 border border-purple-200">
            <span className="font-bold text-purple-700">Closing Tag:</span>{" "}
            <span className="text-purple-900">{metadata.closing_tag}</span>
          </p>
        )}

        {/* Expand/Collapse Button */}
        <Button
          variant="outline"
          size="lg"
          className="w-full mt-4 hover:bg-indigo-50 hover:border-indigo-300"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-5 w-5 mr-2" />
              Hide Advanced Details
            </>
          ) : (
            <>
              <ChevronDown className="h-5 w-5 mr-2" />
              Show Advanced Details
            </>
          )}
        </Button>
      </div>

      {/* Collapsible Details */}
      {isExpanded && metadata && (
        <div className="px-6 pb-6 space-y-6 border-t bg-gray-50/50 pt-6">
          {/* Structure Section */}
          {metadata.structure && (
            <div className="space-y-3">
              <h4 className="font-bold text-lg flex items-center gap-2 text-gray-900">
                <Layers className="h-5 w-5 text-indigo-600" />
                Narrative Structure
              </h4>
              <div className="bg-white rounded-xl p-4 space-y-3 border shadow-sm">
                {metadata.structure.description && (
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {metadata.structure.description}
                  </p>
                )}
                {metadata.structure.phases &&
                  metadata.structure.phases.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500 font-semibold uppercase">
                        Story Phases:
                      </span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {metadata.structure.phases.map((phase, idx) => (
                          <Badge
                            key={idx}
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0"
                          >
                            {idx + 1}. {phase.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                {metadata.structure.cliffhanger && (
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <span className="text-xs text-yellow-700 font-semibold uppercase">
                      Cliffhanger:
                    </span>
                    <p className="text-sm mt-1 text-yellow-900">
                      {metadata.structure.cliffhanger}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Shot Sequence Section */}
          {metadata.shot_sequence && metadata.shot_sequence.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-lg flex items-center gap-2 text-gray-900">
                <Film className="h-5 w-5 text-indigo-600" />
                Shot Sequence ({metadata.shot_sequence.length} shots)
              </h4>
              <div className="bg-white rounded-xl p-4 max-h-[400px] overflow-y-auto border shadow-sm">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="border-b-2">
                      <th className="text-left p-2 font-semibold">#</th>
                      <th className="text-left p-2 font-semibold">Scene</th>
                      <th className="text-left p-2 font-semibold">Timecode</th>
                      <th className="text-left p-2 font-semibold">Duration</th>
                      <th className="text-left p-2 font-semibold">Purpose</th>
                      <th className="text-left p-2 font-semibold">Audio</th>
                      <th className="text-left p-2 font-semibold">Transition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metadata.shot_sequence.map(
                      (shot: ShotSequenceItem, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-mono font-bold">{shot.order}</td>
                          <td className="p-2 font-mono">{shot.scene_ref}</td>
                          <td className="p-2 font-mono text-xs">
                            {shot.timecode_start?.substring(0, 8)} -{" "}
                            {shot.timecode_end?.substring(0, 8)}
                          </td>
                          <td className="p-2">{shot.recommended_duration}s</td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-xs">
                              {shot.purpose?.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="p-2 text-xs">{shot.audio_recommendation}</td>
                          <td className="p-2 text-xs">{shot.transition_in}</td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Music Recommendation Section */}
          {metadata.music_recommendation && (
            <div className="space-y-3">
              <h4 className="font-bold text-lg flex items-center gap-2 text-gray-900">
                <Music className="h-5 w-5 text-indigo-600" />
                Music Recommendation
              </h4>
              <div className="bg-white rounded-xl p-4 grid grid-cols-2 gap-4 border shadow-sm">
                {metadata.music_recommendation.style && (
                  <div>
                    <span className="text-xs text-gray-500 font-semibold">Style:</span>
                    <p className="capitalize font-medium text-gray-900">
                      {metadata.music_recommendation.style}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-gray-500 font-semibold">
                    Has Dialogue Gaps:
                  </span>
                  <p className="font-medium text-gray-900">
                    {metadata.music_recommendation.has_dialogue_gaps
                      ? "Yes"
                      : "No"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Text Overlays Section */}
          {metadata.text_overlays && metadata.text_overlays.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-lg flex items-center gap-2 text-gray-900">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                Text Overlays
              </h4>
              <div className="bg-white rounded-xl p-4 space-y-3 border shadow-sm">
                {metadata.text_overlays.map((overlay, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <span className="font-medium">{overlay.text}</span>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {overlay.phase}
                      </Badge>
                      <span className="text-sm text-gray-600 font-mono">
                        {overlay.timing}s
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download Button */}
          {variant.signedUrl && (
            <div className="pt-4">
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
                onClick={() => window.open(variant.signedUrl, "_blank")}
              >
                <Download className="h-5 w-5 mr-2" />
                Download High-Quality Video
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TrailerDetail() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string | undefined;

  const { hasReadAccess } = useTrailerAccess();
  const queryClient = useQueryClient();
  const previousStatusRef = useRef<TrailerStatusEnum | undefined>(undefined);

  const {
    data: trailerDetail,
    isLoading: loading,
    error,
  } = useTrailerDetailQuery(projectId, { enabled: !!projectId });

  const shouldPollStatus = useMemo(() => {
    if (!trailerDetail) return false;
    return !!trailerDetail.rawMediaId;
  }, [trailerDetail]);

  const { data: statusData } = useTrailerStatusQuery(projectId, {
    enabled: shouldPollStatus && !!projectId,
    onData: (data) => {
      if (data.status && previousStatusRef.current !== data.status) {
        const wasPolling =
          previousStatusRef.current &&
          !TERMINAL_STATUSES.includes(previousStatusRef.current);
        const isNowTerminal = TERMINAL_STATUSES.includes(data.status);

        if (wasPolling && isNowTerminal) {
          queryClient.invalidateQueries({
            queryKey: ["trailer", "list"],
          });
          queryClient.invalidateQueries({
            queryKey: ["trailer", "detail", projectId],
          });
        }

        previousStatusRef.current = data.status;
      }
    },
  });

  if (!hasReadAccess) {
    return <AccessDeniedState />;
  }

  if (projectId && error) {
    return (
      <ErrorState message="Error loading trailer project. Please try again." />
    );
  }

  if (projectId && loading) {
    return <LoadingState />;
  }

  if (projectId && !trailerDetail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-12 text-center">
            <p className="text-xl text-red-600 font-semibold">
              Trailer project not found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Detail view
  if (projectId && trailerDetail) {
    const detailFields = [
      {
        label: "Project ID",
        value: trailerDetail.projectId,
        className: "font-mono text-sm",
      },
      {
        label: "Raw Media ID",
        value: trailerDetail.rawMediaId || "-",
        className: "font-mono text-sm",
      },
      {
        label: "Content Slug",
        value: trailerDetail.contentSlug || "-",
      },
      {
        label: "Title",
        value: trailerDetail.contentMetadata?.title || "-",
      },
      {
        label: "Genre",
        value: trailerDetail.contentMetadata?.genre || "-",
      },
      {
        label: "Language",
        value: trailerDetail.contentMetadata?.language || "-",
      },
      {
        label: "Target Duration",
        value: trailerDetail.contentMetadata?.targetDuration
          ? `${trailerDetail.contentMetadata.targetDuration}s`
          : "-",
      },
      {
        label: "Status",
        render: () => (
          <Badge
            className={`${getStatusColor(statusData?.status || TrailerStatusEnum.IDLE)} border text-base px-4 py-1.5`}
          >
            {statusData?.status || "Pending"}
          </Badge>
        ),
      },
      {
        label: "Created At",
        value: formatDateForDisplay(trailerDetail.createdAt),
        className: "text-sm",
      },
      {
        label: "Completed At",
        value: formatDateForDisplay(trailerDetail.completedAt),
        className: "text-sm",
      },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => router.push("/trailer")}
                    className="text-white hover:bg-white/20"
                  >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Back to Projects
                  </Button>
                  <CardTitle className="text-3xl font-bold">
                    {trailerDetail.contentMetadata?.title || "Trailer Project"}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-8">
                <TrailerForm
                  initialValues={{
                    projectId: trailerDetail.projectId,
                    contentSlug: trailerDetail.contentSlug,
                    contentMetadata: trailerDetail.contentMetadata,
                  }}
                  isEditMode={true}
                  rawMediaId={trailerDetail.rawMediaId}
                />

                {statusData &&
                  (statusData.status === TrailerStatusEnum.IDLE ||
                    statusData.status === TrailerStatusEnum.PROCESSING) && (
                    <TrailerProgress
                      progress={statusData.progress}
                      statusType={statusData.statusType}
                      status={statusData.status}
                    />
                  )}

                <div className="grid grid-cols-2 gap-6 pt-6 border-t-2">
                  {detailFields.map((field) => (
                    <div key={field.label} className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        {field.label}
                      </label>
                      {field.render ? (
                        <div className="mt-2">{field.render()}</div>
                      ) : (
                        <p className={`mt-2 text-gray-900 ${field.className || ""}`}>
                          {field.value}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {trailerDetail.error && (
                  <div className="pt-6 border-t-2">
                    <h3 className="text-xl font-bold text-red-600 mb-3">
                      Error
                    </h3>
                    <p className="text-red-700 bg-red-50 p-4 rounded-lg">
                      {trailerDetail.error}
                    </p>
                  </div>
                )}

                {/* Editor Guide & Narrative JSON Links */}
                {(trailerDetail.editorGuideUrl ||
                  trailerDetail.narrativeJsonUrl) && (
                  <div className="pt-6 border-t-2 space-y-4">
                    <h3 className="text-2xl font-bold text-gray-900">Resources</h3>
                    <div className="flex gap-4">
                      {trailerDetail.editorGuideUrl && (
                        <Button
                          size="lg"
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            window.open(trailerDetail.editorGuideUrl, "_blank")
                          }
                        >
                          <FileText className="h-5 w-5 mr-2" />
                          Editor Guide (MD)
                        </Button>
                      )}
                      {trailerDetail.narrativeJsonUrl && (
                        <Button
                          size="lg"
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            window.open(trailerDetail.narrativeJsonUrl, "_blank")
                          }
                        >
                          <FileJson className="h-5 w-5 mr-2" />
                          Narrative Report (JSON)
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {trailerDetail.variants && trailerDetail.variants.length > 0 && (
                  <div className="pt-6 border-t-2 space-y-6">
                    <h3 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                      <Sparkles className="h-8 w-8 text-yellow-500" />
                      Generated Variants ({trailerDetail.variants.length})
                    </h3>
                    <div className="grid gap-8">
                      {trailerDetail.variants.map((variant: TrailerVariant) => (
                        <VariantCard key={variant.id} variant={variant} />
                      ))}
                    </div>
                  </div>
                )}

                {trailerDetail.recommendations && (
                  <div className="pt-6 border-t-2 space-y-4">
                    <h3 className="text-2xl font-bold text-gray-900">AI Recommendations</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {trailerDetail.recommendations.bestAutoGenerated && (
                        <div className="p-4 border-2 border-green-200 rounded-xl bg-green-50">
                          <span className="text-sm text-green-700 font-semibold">
                            Best Auto-Generated
                          </span>
                          <p className="font-bold text-lg text-green-900">
                            {trailerDetail.recommendations.bestAutoGenerated}
                          </p>
                        </div>
                      )}
                      {trailerDetail.recommendations.bestForMarketing && (
                        <div className="p-4 border-2 border-blue-200 rounded-xl bg-blue-50">
                          <span className="text-sm text-blue-700 font-semibold">
                            Best for Marketing
                          </span>
                          <p className="font-bold text-lg text-blue-900">
                            {trailerDetail.recommendations.bestForMarketing}
                          </p>
                        </div>
                      )}
                      {trailerDetail.recommendations.bestForSocialMedia && (
                        <div className="p-4 border-2 border-purple-200 rounded-xl bg-purple-50">
                          <span className="text-sm text-purple-700 font-semibold">
                            Best for Social Media
                          </span>
                          <p className="font-bold text-lg text-purple-900">
                            {trailerDetail.recommendations.bestForSocialMedia}
                          </p>
                        </div>
                      )}
                      {trailerDetail.recommendations.editorNotes && (
                        <div className="p-4 border-2 border-yellow-200 rounded-xl bg-yellow-50 col-span-2">
                          <span className="text-sm text-yellow-700 font-semibold">
                            Editor Notes
                          </span>
                          <p className="font-bold text-lg text-yellow-900">
                            {trailerDetail.recommendations.editorNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Create view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto">
        <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => router.push("/trailer")}
                  className="text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Projects
                </Button>
                <CardTitle className="text-3xl font-bold">Create Trailer Project</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              <TrailerForm />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
