"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTrailerForm } from "../hooks/useTrailerForm";
import { VideoUploader } from "@/components/VideoUploader";
import { ContentTypeEnum } from "@/types/variant";
import { useGenerateTrailerMutation, useDraftNarrativeMutation } from "@/service/modules/trailer.api";
import { useImperativeHandle, forwardRef, useEffect } from "react";
import { TrailerUploadStatusEnum } from "@/types/trailer";
import { RawMediaStatusEnum } from "@/types/videoQc";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, Sparkles, Film, Zap, CheckCircle2, AlertCircle } from "lucide-react";

interface TrailerFormProps {
  initialValues?: {
    projectId?: string;
    contentSlug?: string;
    contentMetadata?: {
      title?: string;
      genre?: string;
      language?: string;
      targetDuration?: number;
    };
  };
  isEditMode?: boolean;
  rawMediaId?: string;
  onUploadStateChange?: (state: TrailerFormRef | null) => void;
}

export interface TrailerFormRef {
  uploadStatus: TrailerUploadStatusEnum;
  uploadProgress: number;
  uploadError: string | null;
  isUploading: boolean;
  fileName?: string;
  partProgress?: {
    partNumber: number;
    progress: number;
    totalParts: number;
  };
}

export const TrailerForm = forwardRef<TrailerFormRef, TrailerFormProps>(
  ({ initialValues, isEditMode, rawMediaId, onUploadStateChange }, ref) => {
    const router = useRouter();
    const {
      form,
      handleSubmit,
      isLoading,
      multipartS3Uploader,
      generateUploadUrl,
      isEditMode: formIsEditMode,
      uploadInfoRef,
    } = useTrailerForm({ initialValues, isEditMode });

    const { mutateAsync: generateTrailer, isPending: isGeneratingTrailer } =
      useGenerateTrailerMutation();

    const { mutateAsync: draftNarrative, isPending: isDraftingNarrative } =
      useDraftNarrativeMutation();

    const handleGenerateTrailer = async () => {
      try {
        const currentRawMediaId =
          rawMediaId || uploadInfoRef.current?.rawMediaId;
        if (!currentRawMediaId) {
          toast.error("Please upload a video first");
          return;
        }

        const contentMetadata = form.getValues("contentMetadata");
        toast.success("Starting trailer generation...");
        await generateTrailer({
          rawMediaId: currentRawMediaId,
          contentMetadata: contentMetadata,
          targetDuration: contentMetadata?.targetDuration || 90,
        });
        toast.success("Trailer generation started! Check back in a few minutes.");
      } catch (error: any) {
        toast.error(error.message || "Error generating trailer");
        console.error("Error generating trailer:", error);
      }
    };

    const handleDraftNarrative = async () => {
      try {
        const currentRawMediaId =
          rawMediaId || uploadInfoRef.current?.rawMediaId;
        if (!currentRawMediaId) {
          toast.error("Raw media ID is required to draft narrative");
          return;
        }

        const contentMetadata = form.getValues("contentMetadata");
        const result = await draftNarrative({
          rawMediaId: currentRawMediaId,
          contentMetadata: contentMetadata,
          targetDuration: contentMetadata?.targetDuration || 120,
        });

        toast.success("Narrative draft generation started!");

        // Redirect to narrative review page
        if (result.projectId) {
          router.push(`/trailer/narrative/${result.projectId}`);
        }
      } catch (error: any) {
        toast.error(error.message || "Error drafting narrative");
        console.error("Error drafting narrative:", error);
      }
    };

    const disabled = formIsEditMode || isEditMode;

    const activeUploader = multipartS3Uploader;
    const activeFile = activeUploader.files[0];
    const isUploading =
      activeUploader.status === "uploading" ||
      activeUploader.status === "upload-completed";

    const uploadState: TrailerFormRef = {
      uploadStatus:
        activeUploader.status === RawMediaStatusEnum.UPLOADING
          ? TrailerUploadStatusEnum.UPLOADING
          : TrailerUploadStatusEnum.UPLOAD_COMPLETED,
      uploadProgress: activeFile?.progress || 0,
      uploadError: activeUploader.error,
      isUploading: isUploading,
      fileName: activeFile?.name,
    };

    useImperativeHandle(ref, () => uploadState, [
      activeUploader.status,
      activeUploader.error,
      activeFile?.progress,
      activeFile?.name,
      isUploading,
    ]);

    useEffect(() => {
      onUploadStateChange?.(uploadState);
    }, [
      activeUploader.status,
      activeUploader.error,
      activeFile?.progress,
      activeFile?.name,
      isUploading,
      onUploadStateChange,
    ]);

    const isUploadComplete = activeUploader.status === "upload-completed";

    return (
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* PREMIUM HEADER */}
          <div className="text-center space-y-4 pb-8 border-b-2 border-gray-200">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl">
              <Film className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
              {disabled ? "Trailer Project" : "Create New Trailer"}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {disabled
                ? "View and generate your AI-powered trailer variants"
                : "Upload your content and let AI create professional trailers in minutes"
              }
            </p>
          </div>

          {/* PROJECT DETAILS - PREMIUM CARDS */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              Project Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold text-gray-800">Project ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., my-awesome-trailer-001"
                        disabled={disabled}
                        className="h-14 text-lg border-2 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contentSlug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold text-gray-800">Content Slug</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., my-movie-slug"
                        disabled={disabled}
                        className="h-14 text-lg border-2 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* CONTENT METADATA - PREMIUM CARDS */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <span className="text-purple-600 font-bold">2</span>
              </div>
              Content Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="contentMetadata.title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold text-gray-800">Movie/Video Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., The Great Adventure"
                        disabled={disabled}
                        className="h-14 text-lg border-2 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contentMetadata.genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold text-gray-800">Genre</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Drama, Action, Comedy"
                        disabled={disabled}
                        className="h-14 text-lg border-2 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contentMetadata.language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold text-gray-800">Language</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., English, Hindi, Tamil"
                        disabled={disabled}
                        className="h-14 text-lg border-2 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contentMetadata.targetDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold text-gray-800">Target Duration (seconds)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="90"
                        disabled={disabled}
                        className="h-14 text-lg border-2 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 90)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* VIDEO UPLOAD - PREMIUM SECTION */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <span className="text-green-600 font-bold">3</span>
              </div>
              Upload Video
            </h3>

            {/* Important Notice */}
            {!disabled && !form.watch("projectId") && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 text-lg mb-1">
                    📋 Enter Project ID First!
                  </h4>
                  <p className="text-amber-800">
                    Please fill in the <strong>Project ID</strong> in Step 1 before uploading your video.
                    This is required to organize and track your upload.
                  </p>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="videoFile"
              render={() => (
                <FormItem>
                  <FormControl>
                    <div className={`relative transition-opacity ${!disabled && !form.watch("projectId") ? "opacity-50 pointer-events-none" : ""}`}>
                      <VideoUploader
                        files={multipartS3Uploader.files}
                        error={multipartS3Uploader.error}
                        addFiles={multipartS3Uploader.addFiles}
                        startMultipartUpload={multipartS3Uploader.startUpload}
                        status={multipartS3Uploader.status}
                        removeFile={multipartS3Uploader.removeFile}
                        reset={multipartS3Uploader.reset}
                        generateUploadUrl={generateUploadUrl}
                        contentType={ContentTypeEnum.MIXED}
                        contentSlug="trailer"
                      />
                      {isUploadComplete && (
                        <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-semibold">Upload Complete!</span>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* ACTION BUTTONS - PREMIUM */}
          {!disabled && (
            <div className="flex justify-end gap-4 pt-8 border-t-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  form.reset();
                  multipartS3Uploader.reset();
                }}
                disabled={isLoading}
                className="h-14 px-8 text-lg rounded-xl border-2"
              >
                Reset Form
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !isUploadComplete}
                size="lg"
                className="h-14 px-8 text-lg rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating Project...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Create Trailer Project
                  </>
                )}
              </Button>
            </div>
          )}

          {/* GENERATION BUTTONS - PREMIUM */}
          {disabled && (rawMediaId || uploadInfoRef.current?.rawMediaId) && (
            <div className="space-y-4 pt-8 border-t-2">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <span className="text-yellow-600 font-bold">4</span>
                </div>
                Generate Trailer
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleDraftNarrative}
                  disabled={isDraftingNarrative || isGeneratingTrailer}
                  className="h-16 text-lg rounded-xl border-2 border-blue-300 hover:bg-blue-50"
                >
                  {isDraftingNarrative ? (
                    <>
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                      Drafting...
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                      <div className="text-left">
                        <div className="font-bold">Draft Narrative First</div>
                        <div className="text-xs text-gray-600">Review before generating</div>
                      </div>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  size="lg"
                  onClick={handleGenerateTrailer}
                  disabled={isGeneratingTrailer || isDraftingNarrative}
                  className="h-16 text-lg rounded-xl bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-xl"
                >
                  {isGeneratingTrailer ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 mr-2" />
                      <div className="text-left">
                        <div className="font-bold">Generate Trailer Now</div>
                        <div className="text-xs opacity-90">AI will create 8 variants</div>
                      </div>
                    </>
                  )}
                </Button>
              </div>

              <p className="text-sm text-gray-600 text-center bg-blue-50 p-4 rounded-xl">
                <strong>💡 Tip:</strong> Generation takes 5-15 minutes depending on video length.
                You'll get multiple high-quality trailer variants automatically!
              </p>
            </div>
          )}
        </form>
      </Form>
    );
  }
);

TrailerForm.displayName = "TrailerForm";
