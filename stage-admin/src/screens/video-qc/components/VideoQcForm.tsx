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
import { useVideoQcForm } from "../hooks/useVideoQcForm";
import { VideoUploader } from "@/components/VideoUploader";
import { ContentTypeEnum } from "@/types/variant";
import { useInitiateVideoQcMutation } from "@/service/modules/videoQc.api";
import { useImperativeHandle, forwardRef, useEffect } from "react";
import { RawMediaStatusEnum } from "@/types/videoQc";

interface VideoQcFormProps {
  initialValues?: {
    projectId?: string;
  };
  isEditMode?: boolean;
  onUploadStateChange?: (state: VideoQcFormRef | null) => void;
}

export interface VideoQcFormRef {
  uploadStatus: RawMediaStatusEnum;
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

export const VideoQcForm = forwardRef<VideoQcFormRef, VideoQcFormProps>(
  ({ initialValues, isEditMode, onUploadStateChange }, ref) => {
    const {
      form,
      handleSubmit,
      isLoading,
      multipartS3Uploader,
      generateUploadUrl,
      isEditMode: formIsEditMode,
    } = useVideoQcForm({ initialValues, isEditMode });

    const { mutateAsync: initiateVideoQc, isPending: isInitiatingVideoQc } =
      useInitiateVideoQcMutation();

    const handleInitiateVideoQc = async () => {
      try {
        const currentProjectId = form.getValues("projectId");
        await initiateVideoQc({
          projectId: currentProjectId,
        });
      } catch (error) {
        console.error("Error initiating video QC:", error);
      }
    };

    const disabled = formIsEditMode || isEditMode;

    // Determine which uploader is active (only multipart is used)
    const activeUploader = multipartS3Uploader;

    const activeFile = activeUploader.files[0];
    const isUploading =
      activeUploader.status === RawMediaStatusEnum.UPLOADING ||
      activeUploader.status === RawMediaStatusEnum.UPLOAD_COMPLETED;

    // Expose uploader state via ref
    const uploadState: VideoQcFormRef = {
      uploadStatus: activeUploader.status,
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

    // Notify parent of upload state changes
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

    return (
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter project ID (e.g., dev-test-dos)"
                    disabled={disabled}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="videoFile"
            render={() => (
              <FormItem>
                <FormLabel>Video File</FormLabel>
                <FormControl>
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
                    contentSlug="video-qc"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!disabled && (
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  multipartS3Uploader.reset();
                }}
                disabled={isLoading}
              >
                Reset
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Video QC"}
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleInitiateVideoQc}
              disabled={isInitiatingVideoQc}
            >
              {isInitiatingVideoQc ? "Initiating..." : "Initiate Video QC"}
            </Button>
          </div>
        </form>
      </Form>
    );
  }
);

VideoQcForm.displayName = "VideoQcForm";
