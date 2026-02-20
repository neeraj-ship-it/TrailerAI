"use client";

import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { UploadFile } from "@/hooks/useS3Uploader";
import { ContentTypeEnum } from "@/types/variant";
import { useToast } from "@/hooks/useToast";
import { GenerateVideoUploadUrlPayload } from "@/hooks/useUploadVideo.mutation";
import { RawMediaStatusEnum } from "@/types/videoQc";

interface VideoUploaderProps {
  files: UploadFile[];
  status: RawMediaStatusEnum;
  error: string | null;
  addFiles: (fileList: FileList) => Promise<UploadFile[]>;
  startUpload: (
    filesToUpload: UploadFile[],
    uploadUrls: Record<string, { uploadUrl: string; rawMediaId: string }>
  ) => Promise<void>;
  removeFile: (fileId: string) => void;
  reset: () => void;
  generateUploadUrl: (payload: GenerateVideoUploadUrlPayload) => Promise<{
    fileId: string;
    url: string;
    rawMediaId: string;
    uploadUrl: string;
  }>;
  contentType: ContentTypeEnum;
  contentSlug: string;
}

export const VideoUploader = ({
  files,
  status,
  error,
  addFiles,
  startUpload,
  removeFile,
  reset,
  generateUploadUrl,
  contentType,
  contentSlug,
}: VideoUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        // Clear existing files first since we only allow one file
        if (files.length > 0) {
          reset();
        }

        // Create a FileList from the single file using DataTransfer
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        const fileList = dataTransfer.files;

        await addFiles(fileList);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to add file. Please try again.",
        });
      } finally {
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    },
    [addFiles, toast, files, reset]
  );

  const handleUpload = useCallback(async () => {
    if (files.length === 0) {
      toast({
        variant: "destructive",
        title: "No file",
        description: "Please select a video to upload.",
      });
      return;
    }

    try {
      // Generate upload URLs for all files
      const uploadUrlPromises = files.map(async (file) => {
        const fileExtension = file.name.split(".").pop() || "";
        const result = await generateUploadUrl({
          fileExtension,
          mimeType: file.file.type,
          duration: file.duration,
          contentType,
          contentSlug,
        });

        return {
          fileId: file.id,
          uploadUrl: result.uploadUrl,
          rawMediaId: result.rawMediaId,
        };
      });

      const uploadUrls = await Promise.all(uploadUrlPromises);

      // Create the uploadUrls record
      const uploadUrlsRecord: Record<
        string,
        { uploadUrl: string; rawMediaId: string }
      > = {};
      uploadUrls.forEach(({ fileId, uploadUrl, rawMediaId }) => {
        uploadUrlsRecord[fileId] = { uploadUrl, rawMediaId };
      });

      // Start upload - this will update the files state internally
      await startUpload(files, uploadUrlsRecord);

      toast({
        title: "Success",
        description: "Video uploaded successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Failed to upload video.",
      });
    }
  }, [files, generateUploadUrl, contentType, contentSlug, startUpload, toast]);

  const handleRemoveFile = useCallback(
    (fileId: string) => {
      removeFile(fileId);
    },
    [removeFile]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === RawMediaStatusEnum.UPLOADING}
        >
          Select Video
        </Button>
        {files.length > 0 && (
          <>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={status === RawMediaStatusEnum.UPLOADING}
            >
              {status === RawMediaStatusEnum.UPLOADING
                ? "Uploading..."
                : "Upload"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={reset}
              disabled={status === RawMediaStatusEnum.UPLOADING}
            >
              Reset
            </Button>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Selected Video:</h3>
          <div className="flex flex-col gap-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-medium">
                    {file.name}
                  </span>
                  {file.status === RawMediaStatusEnum.UPLOADING && (
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {file.progress}%
                      </span>
                    </div>
                  )}
                  {file.status === RawMediaStatusEnum.UPLOAD_COMPLETED && (
                    <span className="text-xs text-green-600">
                      Upload complete
                    </span>
                  )}
                  {file.status === RawMediaStatusEnum.UPLOAD_FAILED && (
                    <span className="text-xs text-destructive">
                      {file.error || "Upload failed"}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFile(file.id)}
                  disabled={status === RawMediaStatusEnum.UPLOADING}
                  className="shrink-0 self-start sm:self-center"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
