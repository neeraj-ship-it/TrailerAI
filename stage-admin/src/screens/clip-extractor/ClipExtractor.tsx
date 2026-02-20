"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useClipExtractor } from "./hooks/useClipExtractor";
import {
  AccessDeniedState,
  ErrorState,
  LoadingState,
} from "./components";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Scissors,
  Clock,
  ArrowRight,
  Film,
} from "lucide-react";
import { formatTimestamp } from "@/utils/helpers";
import { ClipExtractorStatusEnum } from "@/types/clip-extractor";

const getStatusColor = (status?: string) => {
  switch (status) {
    case ClipExtractorStatusEnum.COMPLETED:
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case ClipExtractorStatusEnum.PROCESSING:
      return "bg-blue-500/10 text-blue-600 border-blue-500/20 animate-pulse";
    case ClipExtractorStatusEnum.FAILED:
      return "bg-red-500/10 text-red-600 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  }
};

export default function ClipExtractor() {
  const router = useRouter();
  const {
    data,
    loading,
    error,
    searchQuery,
    handleSearchChange,
    hasReadAccess,
    hasWriteAccess,
  } = useClipExtractor();

  if (!hasReadAccess) {
    return <AccessDeniedState />;
  }

  if (error) {
    return <ErrorState message="Error loading clip extractor projects. Please try again." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 text-white">
        <div className="container mx-auto px-6 py-16">
          <div className="flex items-center justify-between">
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                  <Scissors className="h-8 w-8" />
                </div>
                <h1 className="text-5xl font-bold tracking-tight">
                  Clip Extractor AI
                </h1>
              </div>
              <p className="text-xl text-white/90">
                AI-Powered Clip Extraction from Movie Narratives
              </p>
              <p className="text-lg text-white/70 max-w-xl">
                Provide a video URL and narrative, and let AI extract the best
                clips automatically. Perfect for marketing, social media, and promos.
              </p>
            </div>
            {hasWriteAccess && (
              <Button
                size="lg"
                className="bg-white text-teal-600 hover:bg-white/90 text-lg px-8 py-6 shadow-2xl"
                onClick={() => router.push("/clip-extractor/create")}
              >
                <Plus className="h-5 w-5 mr-2" />
                New Extraction
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        {/* Search & Filters */}
        <Card className="mb-8 border-none shadow-xl bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search projects by ID or title..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-12 h-12 text-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                {data.length} Projects
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        {loading ? (
          <LoadingState />
        ) : data.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-300 bg-white/50">
            <CardContent className="p-16 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-full flex items-center justify-center mb-6">
                <Scissors className="h-10 w-10 text-teal-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                No Projects Yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Start by creating your first clip extraction project. Paste a video URL,
                provide the narrative, and let AI find the best clips!
              </p>
              {hasWriteAccess && (
                <Button
                  size="lg"
                  onClick={() => router.push("/clip-extractor/create")}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Project
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((project) => (
              <Card
                key={project.projectId}
                className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-none bg-white/80 backdrop-blur-sm hover:scale-105"
                onClick={() =>
                  router.push(`/clip-extractor/${project.projectId}`)
                }
              >
                <CardContent className="p-6">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <Badge
                      className={`${getStatusColor(project.status)} border px-3 py-1`}
                    >
                      {project.status || "Idle"}
                    </Badge>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                  </div>

                  {/* Project Info */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1">
                        {project.contentTitle || "Untitled"}
                      </h3>
                      <p className="text-sm text-gray-500 font-mono">
                        {project.projectId}
                      </p>
                    </div>

                    {/* Clips Count & Progress */}
                    <div className="flex items-center gap-3">
                      {project.clipsCount > 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          <Film className="h-4 w-4 text-teal-500" />
                          <span className="text-gray-700 font-medium">
                            {project.clipsCount} Clips
                          </span>
                        </div>
                      )}
                      {project.status === ClipExtractorStatusEnum.PROCESSING && (
                        <Badge variant="outline" className="text-xs">
                          {project.progress}%
                        </Badge>
                      )}
                    </div>

                    {/* Timestamp */}
                    {project.createdAt && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 pt-3 border-t">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimestamp(project.createdAt)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
