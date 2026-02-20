"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipExtractorClip } from "@/types/clip-extractor";
import {
  Clock,
  Download,
  HardDrive,
  Star,
  Play,
} from "lucide-react";

interface ClipCardProps {
  clip: ClipExtractorClip;
  index: number;
}

export function ClipCard({ clip, index }: ClipCardProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "-";
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500/10 text-green-700 border-green-500/30";
    if (score >= 60) return "bg-yellow-500/10 text-yellow-700 border-yellow-500/30";
    return "bg-gray-500/10 text-gray-700 border-gray-500/30";
  };

  const getToneColor = (tone: string) => {
    const colors: Record<string, string> = {
      dramatic: "bg-purple-100 text-purple-700",
      action: "bg-red-100 text-red-700",
      emotional: "bg-blue-100 text-blue-700",
      comedic: "bg-yellow-100 text-yellow-700",
      suspenseful: "bg-orange-100 text-orange-700",
      romantic: "bg-pink-100 text-pink-700",
    };
    return colors[tone.toLowerCase()] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="border-2 rounded-2xl bg-gradient-to-br from-white to-gray-50 overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
      {/* Video Player */}
      {clip.clipUrl ? (
        <div className="bg-black relative group">
          <video
            src={clip.clipUrl}
            controls
            className="w-full max-h-[360px] object-contain"
            preload="metadata"
          />
        </div>
      ) : (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 h-48 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <Play className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Video not available</p>
          </div>
        </div>
      )}

      {/* Clip Info */}
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm px-3 py-1">
              Clip {index + 1}
            </Badge>
            <Badge className={`capitalize ${getToneColor(clip.emotionalTone)}`}>
              {clip.emotionalTone}
            </Badge>
          </div>
          <Badge className={`${getScoreColor(clip.score)} border px-3 py-1`}>
            <Star className="h-3 w-3 mr-1" />
            {clip.score}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-700 leading-relaxed">
          {clip.description}
        </p>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 p-3 rounded-lg">
            <span className="text-xs text-blue-600 font-semibold">Beat Type</span>
            <p className="font-medium text-blue-900 capitalize">{clip.beatType}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <span className="text-xs text-purple-600 font-semibold">Beat Order</span>
            <p className="font-medium text-purple-900">#{clip.beatOrder}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <span className="text-xs text-green-600 font-semibold">Timecode</span>
            <p className="font-mono text-xs text-green-900">
              {clip.timecodeStart?.substring(0, 8)} - {clip.timecodeEnd?.substring(0, 8)}
            </p>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <span className="text-xs text-orange-600 font-semibold">Duration</span>
            <p className="font-medium text-orange-900 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(clip.duration)}
            </p>
          </div>
        </div>

        {/* File Info + Download */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <HardDrive className="h-4 w-4" />
            <span>{formatFileSize(clip.fileSize)}</span>
            {clip.isCompiled && (
              <Badge variant="outline" className="text-xs">Compiled</Badge>
            )}
          </div>
          {clip.clipUrl && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(clip.clipUrl, "_blank")}
              className="hover:bg-indigo-50 hover:border-indigo-300"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
