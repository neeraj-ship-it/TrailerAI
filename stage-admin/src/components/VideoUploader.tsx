"use client";

import { useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

import { ContentTypeEnum } from "@/types/variant";
import { useToast } from "@/hooks/useToast";
import { GenerateVideoUploadUrlPayload } from "@/hooks/useUploadVideo.mutation";
import { UploadFile } from "@/hooks/useS3Uploader";
import { RawMediaStatusEnum } from "@/types/videoQc";

interface VideoUploaderProps {
  files: UploadFile[];
  error: string | null;
  addFiles: (fileList: FileList) => Promise<UploadFile[]>;
  startMultipartUpload: (
    filesToUpload: UploadFile[],
    uploadInfos: Record<
      string,
      {
        uploadUrl: string;
        rawMediaId: string;
        uploadId: string;
        partUrls: Array<{ partNumber: number; uploadUrl: string }>;
        bucket?: string;
        filePath?: string;
      }
    >
  ) => Promise<void>;
  removeFile: (fileId: string) => void;
  reset: () => void;
  status: RawMediaStatusEnum;
  generateUploadUrl: (payload: GenerateVideoUploadUrlPayload) => Promise<{
    fileId: string;
    url: string;
    rawMediaId: string;
    uploadUrl: string;
    uploadId?: string;
    partUrls?: Array<{ partNumber: number; uploadUrl: string }>;
    bucket?: string;
    filePath?: string;
  }>;
  contentType?: ContentTypeEnum;
  contentSlug?: string;
}

export const VideoUploader = ({
  files,
  error,
  addFiles,
  startMultipartUpload,
  removeFile,
  reset,
  status,
  generateUploadUrl,
  contentType,
  contentSlug,
}: VideoUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);

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
      const uploadUrlPromises = files.map(async (file) => {
        const fileExtension = file.name.split(".").pop() || "";
        const payload: GenerateVideoUploadUrlPayload = {
          fileExtension,
          mimeType: file.file.type,
          duration: file.duration,
          contentType: contentType!,
          contentSlug: contentSlug!,
        };
        const result = await generateUploadUrl(payload);

        return {
          fileId: file.id,
          uploadUrl: result.uploadUrl,
          rawMediaId: result.rawMediaId,
          uploadId: result.uploadId,
          partUrls: result.partUrls,
          bucket: result.bucket,
          filePath: result.filePath,
        };
      });

      const uploadResults = await Promise.all(uploadUrlPromises);

      const multipartUploadInfos: Record<
        string,
        {
          uploadUrl: string;
          rawMediaId: string;
          uploadId: string;
          partUrls: Array<{ partNumber: number; uploadUrl: string }>;
          bucket?: string;
          filePath?: string;
        }
      > = {};

      const missingMultipartInfo = uploadResults.some(
        (result) => !result.uploadId || !result.partUrls?.length
      );

      if (missingMultipartInfo) {
        throw new Error("Multipart upload info is missing for the file");
      }

      uploadResults.forEach((result) => {
        multipartUploadInfos[result.fileId] = {
          uploadUrl: result.uploadUrl,
          rawMediaId: result.rawMediaId,
          uploadId: result.uploadId!,
          partUrls: result.partUrls!,
          bucket: result.bucket,
          filePath: result.filePath,
        };
      });

      await startMultipartUpload(files, multipartUploadInfos);

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
  }, [
    files,
    generateUploadUrl,
    startMultipartUpload,
    toast,
    contentType,
    contentSlug,
  ]);

  const handleRemoveFile = useCallback(
    (fileId: string) => {
      removeFile(fileId);
    },
    [removeFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files?.[0];
      if (!droppedFile) return;

      // Validate video file
      if (!droppedFile.type.startsWith("video/")) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload a video file.",
        });
        return;
      }

      try {
        // Clear existing files first since we only allow one file
        if (files.length > 0) {
          reset();
        }

        // Create a FileList from the single file using DataTransfer
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(droppedFile);
        const fileList = dataTransfer.files;

        await addFiles(fileList);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to add file. Please try again.",
        });
      }
    },
    [addFiles, toast, files, reset]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-4 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
          isDragging
            ? "border-blue-600 bg-blue-50 scale-105"
            : "border-gray-300 bg-gradient-to-br from-gray-50 to-blue-50 hover:border-blue-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-xl">
            <span className="text-4xl">🎬</span>
          </div>
          <div>
            <h4 className="text-2xl font-bold text-gray-900 mb-2">
              {isDragging ? "Drop your video here!" : "Upload Your Video"}
            </h4>
            <p className="text-lg text-gray-600 mb-4">
              Drag & drop your video file or click to browse
            </p>
            <Button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={status === RawMediaStatusEnum.UPLOADING}
              size="lg"
              className="h-14 px-8 text-lg rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
            >
              📁 Select Video File
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            Supports: MP4, MOV, AVI, MKV • Max size: 5GB
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      {files.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <Button
            type="button"
            onClick={handleUpload}
            disabled={status === RawMediaStatusEnum.UPLOADING}
            size="lg"
            className="h-14 px-8 text-lg rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
          >
            {status === RawMediaStatusEnum.UPLOADING
              ? "⬆️ Uploading..."
              : "⬆️ Start Upload"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={reset}
            disabled={status === RawMediaStatusEnum.UPLOADING}
            size="lg"
            className="h-14 px-8 text-lg rounded-xl border-2"
          >
            🔄 Reset
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border-2 border-red-300 p-4 text-base text-red-700 font-medium">
          ❌ {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-gray-900">📹 Selected Video:</h3>
          <div className="flex flex-col gap-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-xl border-2 border-gray-300 bg-white p-5 shadow-md"
              >
                <div className="flex flex-1 flex-col gap-2">
                  <span className="text-base font-semibold text-gray-900">{file.name}</span>
                  <span className="text-sm text-gray-600">Size: {(file.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                  {file.status === RawMediaStatusEnum.UPLOADING && (
                    <div className="flex items-center gap-3">
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <span className="text-base font-bold text-blue-600">
                        {file.progress}%
                      </span>
                    </div>
                  )}
                  {file.status === RawMediaStatusEnum.UPLOAD_COMPLETED && (
                    <span className="text-base font-semibold text-green-600 flex items-center gap-2">
                      ✅ Upload complete!
                    </span>
                  )}
                  {file.status === RawMediaStatusEnum.UPLOAD_FAILED && (
                    <span className="text-base font-semibold text-red-600 flex items-center gap-2">
                      ❌ {file.error || "Upload failed"}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => handleRemoveFile(file.id)}
                  disabled={status === RawMediaStatusEnum.UPLOADING}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  🗑️ Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
