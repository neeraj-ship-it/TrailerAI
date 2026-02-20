"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateClipExtractorProject,
  useStartClipExtraction,
} from "@/service/modules/clip-extractor.api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Link2,
  Settings2,
  Sparkles,
  Zap,
} from "lucide-react";
import { useClipExtractorAccess } from "./hooks/useClipExtractor";
import { AccessDeniedState } from "./components";

export default function ClipExtractorNew() {
  const router = useRouter();
  const { hasWriteAccess } = useClipExtractorAccess();
  const createMutation = useCreateClipExtractorProject();
  const startMutation = useStartClipExtraction();

  const [videoUrl, setVideoUrl] = useState("");
  const [contentSlug, setContentSlug] = useState("");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [language, setLanguage] = useState("hi");
  const [numClips, setNumClips] = useState(5);
  const [minClipDuration, setMinClipDuration] = useState(60);
  const [maxClipDuration, setMaxClipDuration] = useState(120);
  const [generateCompiled, setGenerateCompiled] = useState(true);
  const [compiledMaxDuration, setCompiledMaxDuration] = useState(120);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!hasWriteAccess) {
    return <AccessDeniedState />;
  }

  const handleSubmit = async () => {
    if (!videoUrl.trim()) {
      toast.error("Please enter a video URL");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createMutation.mutateAsync({
        videoUrl: videoUrl.trim(),
        contentSlug: contentSlug.trim() || undefined,
        contentMetadata: {
          title: title.trim() || undefined,
          genre: genre.trim() || undefined,
          language: language.trim() || undefined,
        },
        clipConfig: {
          numClips,
          minClipDuration,
          maxClipDuration,
          generateCompiled,
          compiledMaxDuration,
        },
      });

      toast.success("Project created! Starting extraction...");

      // Auto-start extraction
      try {
        await startMutation.mutateAsync(result.projectId);
        toast.success("Clip extraction started!");
      } catch {
        toast.error("Project created but failed to start extraction. You can retry from the detail page.");
      }

      router.push(`/clip-extractor/${result.projectId}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 p-6">
      <div className="max-w-5xl mx-auto">
        <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 text-white">
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
              <CardTitle className="text-3xl font-bold">
                New Clip Extraction
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-10">
              {/* Info Banner */}
              <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-5 flex items-start gap-3">
                <Zap className="w-6 h-6 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-teal-900 text-lg mb-1">
                    Emotion-Based Clip Extraction
                  </h4>
                  <p className="text-teal-800">
                    AI will analyze the video&apos;s audio energy, scene changes, and emotional dynamics
                    to automatically find and extract the most impactful moments. No narrative needed.
                  </p>
                </div>
              </div>

              {/* STEP 1: Video URL + Metadata */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                    <span className="text-teal-600 font-bold">1</span>
                  </div>
                  <Link2 className="h-5 w-5 text-teal-600" />
                  Video Source
                </h3>

                <div className="space-y-2">
                  <Label className="text-lg font-semibold text-gray-800">
                    Video URL (Public CMS Link)
                  </Label>
                  <Input
                    placeholder="https://cdn.stage.in/movies/movie-slug/full-video.mp4"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="h-14 text-lg border-2 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
                  />
                  <p className="text-sm text-gray-500">
                    Paste the public video URL from the STAGE CMS. No upload needed.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-lg font-semibold text-gray-800">
                      Content Slug
                    </Label>
                    <Input
                      placeholder="e.g., my-movie-slug"
                      value={contentSlug}
                      onChange={(e) => setContentSlug(e.target.value)}
                      className="h-14 text-lg border-2 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-lg font-semibold text-gray-800">
                      Title
                    </Label>
                    <Input
                      placeholder="Movie title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-14 text-lg border-2 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-lg font-semibold text-gray-800">
                      Genre
                    </Label>
                    <Input
                      placeholder="e.g., Drama, Action"
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="h-14 text-lg border-2 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-lg font-semibold text-gray-800">
                      Language
                    </Label>
                    <Input
                      placeholder="e.g., hi, en, bho"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="h-14 text-lg border-2 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* STEP 2: Clip Configuration */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 font-bold">2</span>
                  </div>
                  <Settings2 className="h-5 w-5 text-green-600" />
                  Clip Configuration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="font-semibold text-gray-800">
                      Number of Clips
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={numClips}
                      onChange={(e) => setNumClips(parseInt(e.target.value) || 5)}
                      className="h-12 text-lg border-2 focus:border-green-500 focus:ring-green-500 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-gray-800">
                      Min Clip Duration (sec)
                    </Label>
                    <Input
                      type="number"
                      min={10}
                      max={300}
                      value={minClipDuration}
                      onChange={(e) =>
                        setMinClipDuration(parseInt(e.target.value) || 60)
                      }
                      className="h-12 text-lg border-2 focus:border-green-500 focus:ring-green-500 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-gray-800">
                      Max Clip Duration (sec)
                    </Label>
                    <Input
                      type="number"
                      min={30}
                      max={600}
                      value={maxClipDuration}
                      onChange={(e) =>
                        setMaxClipDuration(parseInt(e.target.value) || 120)
                      }
                      className="h-12 text-lg border-2 focus:border-green-500 focus:ring-green-500 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-gray-800">
                      Compiled Max Duration (sec)
                    </Label>
                    <Input
                      type="number"
                      min={30}
                      max={600}
                      value={compiledMaxDuration}
                      onChange={(e) =>
                        setCompiledMaxDuration(parseInt(e.target.value) || 120)
                      }
                      className="h-12 text-lg border-2 focus:border-green-500 focus:ring-green-500 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="generateCompiled"
                    checked={generateCompiled}
                    onChange={(e) => setGenerateCompiled(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <Label
                    htmlFor="generateCompiled"
                    className="font-semibold text-gray-800 cursor-pointer"
                  >
                    Generate compiled video (all best clips combined)
                  </Label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4 pt-8 border-t-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => router.push("/clip-extractor")}
                  className="h-14 px-8 text-lg rounded-xl border-2"
                >
                  Cancel
                </Button>
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !videoUrl.trim()}
                  className="h-14 px-8 text-lg rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-xl"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating & Starting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Extract Clips
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
