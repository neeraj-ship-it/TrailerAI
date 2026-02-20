import { RawMediaStatusEnum } from "@/types/videoQc";
import { useState, useCallback } from "react";

export interface UploadFile {
  id: string;
  name: string;
  file: File;
  progress: number;
  status: RawMediaStatusEnum;
  error?: string;
  url: string; // S3 URL after upload
  rawMediaId?: string;
  episodeId?: string;
  duration: number;
}

interface UseS3UploaderOptions {
  maxFileSize?: number;
  onUploadStart?: ({ fileId, url }: { fileId: string; url: string }) => void;
  onUploadSuccess?: (files: UploadFile[]) => void;
  onError?: (error: Error, episodeId?: string) => void;
  addEpisode?: (seasonIndex: number, rawFieldId: string) => void;
  onUploadProgress?: ({
    fileId,
    uploadProgress,
    file,
  }: {
    fileId: string;
    uploadProgress: number;
    file: string;
  }) => void;
}

const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 5 GB in bytes

export function useS3Uploader({
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  onUploadStart,
  onUploadSuccess,
  onError,
  onUploadProgress,
}: UseS3UploaderOptions = {}) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [status, setStatus] = useState<RawMediaStatusEnum>(
    RawMediaStatusEnum.CREATED
  );
  const [error, setError] = useState<string | null>(null);

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const fileUrl = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(fileUrl);
        resolve(video.duration);
      };

      video.onerror = () => {
        URL.revokeObjectURL(fileUrl);
        reject(new Error("Error loading video file"));
      };

      video.src = fileUrl;
    });
  };

  const addFiles = useCallback(
    async (fileList: FileList, episodeId?: string) => {
      const fileArray = Array.from(fileList);

      const validFiles = fileArray.filter((file) => {
        if (file.size > maxFileSize) {
          const message = "File size exceeds the 5 GB limit";
          setError(message);
          onError?.(new Error(message), episodeId);
          return false;
        }
        return true;
      });

      if (!validFiles.length) {
        return [];
      }

      const processFile = async (file: File): Promise<UploadFile> => {
        let duration = 0;
        if (file.type.startsWith("video/")) {
          try {
            duration = await getVideoDuration(file);
          } catch (error) {
            console.error("Error extracting video duration:", error);
          }
        }

        return {
          id: `${file.name}-${file.size}-${file.lastModified}`,
          name: file.name,
          file,
          progress: 0,
          status: RawMediaStatusEnum.CREATED,
          episodeId,
          url: URL.createObjectURL(file),
          duration,
        };
      };

      const newFiles = await Promise.all(validFiles.map(processFile));

      setFiles([...newFiles]);
      return newFiles;
    },
    [maxFileSize, onError]
  );

  // Remove a file
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => {
      // Revoke object URLs before removing files
      prev.forEach((file) => {
        if (file.id === fileId && file.url?.startsWith("blob:")) {
          URL.revokeObjectURL(file.url);
        }
      });
      return prev.filter((f) => f.id !== fileId);
    });
  }, []);

  // Reset uploader
  const reset = useCallback(() => {
    // Revoke all object URLs before resetting
    files.forEach((file) => {
      if (file.url?.startsWith("blob:")) {
        URL.revokeObjectURL(file.url);
      }
    });
    setFiles([]);
    setStatus(RawMediaStatusEnum.CREATED);
    setError(null);
  }, [files]);

  // Start upload for all files
  const startUpload = useCallback(
    async (
      filesToUpload: UploadFile[],
      uploadUrls: Record<string, { uploadUrl: string; rawMediaId: string }>
    ) => {
      setStatus(RawMediaStatusEnum.UPLOADING);
      setError(null);

      try {
        // Process all files in parallel
        const uploadPromises = filesToUpload.map(async (fileObj) => {
          try {
            if (fileObj.file.size > maxFileSize) {
              const message = "File size exceeds the 50 GB limit";
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === fileObj.id
                    ? {
                        ...f,
                        status: RawMediaStatusEnum.UPLOAD_FAILED,
                        error: message,
                      }
                    : f
                )
              );
              setError(message);
              onError?.(new Error(message), fileObj.episodeId);
              return {
                ...fileObj,
                status: RawMediaStatusEnum.UPLOAD_FAILED,
                error: message,
              };
            }

            const uploadInfo = uploadUrls[fileObj.id];

            if (!uploadInfo) {
              throw new Error(
                `No upload URL provided for file: ${fileObj.name}`
              );
            }

            const { uploadUrl: url, rawMediaId: fileId } = uploadInfo;

            if (!url || !fileId) {
              throw new Error(
                `Invalid upload URL or file ID for file: ${fileObj.name}`
              );
            }

            onUploadStart?.({ fileId, url });

            // Initialize progress to 0 when upload starts
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileObj.id
                  ? {
                      ...f,
                      progress: 0,
                      status: RawMediaStatusEnum.UPLOADING,
                      rawMediaId: fileId,
                      url: url,
                    }
                  : f
              )
            );

            // Calculate throttle threshold based on file size
            const getProgressThreshold = (fileSizeBytes: number): number => {
              // File size in MB
              const fileSizeMB = fileSizeBytes / (1024 * 1024);

              if (fileSizeMB < 10) {
                return 10;
              } else if (fileSizeMB < 100) {
                return 5;
              } else if (fileSizeMB < 500) {
                return 2;
              } else {
                // Very large files (> 500MB): update every 1%
                return 1;
              }
            };

            const progressThreshold = getProgressThreshold(fileObj.file.size);
            let lastReportedProgress = 0;

            // Upload file to S3 with progress
            await new Promise<void>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open("PUT", url, true);
              xhr.setRequestHeader("Content-Type", fileObj.file.type);

              xhr.upload.onprogress = async (event) => {
                if (event.lengthComputable) {
                  const percent = Math.round(
                    (event.loaded / event.total) * 100
                  );

                  // Always update the files state for UI consistency
                  setFiles((prev) =>
                    prev.map((f) =>
                      f.id === fileObj.id
                        ? {
                            ...f,
                            progress: percent,
                            status: RawMediaStatusEnum.UPLOADING,
                            rawMediaId: fileId,
                            url: url,
                          }
                        : f
                    )
                  );

                  // Only call callbacks if progress has changed by the threshold amount
                  const progressDiff = Math.abs(percent - lastReportedProgress);
                  if (progressDiff >= progressThreshold || percent === 100) {
                    onUploadProgress?.({
                      fileId,
                      uploadProgress: percent,
                      file: fileObj.episodeId || "",
                    });
                    lastReportedProgress = percent;
                  }
                }
              };

              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  setFiles((prev) =>
                    prev.map((f) =>
                      f.id === fileObj.id
                        ? {
                            ...f,
                            status: RawMediaStatusEnum.UPLOAD_COMPLETED,
                            progress: 100,
                            url,
                            rawMediaId: fileId,
                          }
                        : f
                    )
                  );
                  resolve();
                } else {
                  setFiles((prev) =>
                    prev.map((f) =>
                      f.id === fileObj.id
                        ? {
                            ...f,
                            status: RawMediaStatusEnum.UPLOAD_FAILED,
                            error: xhr.statusText,
                            rawMediaId: fileId,
                          }
                        : f
                    )
                  );
                  setError(xhr.statusText);
                  onError?.(new Error(xhr.statusText), fileObj.episodeId);
                  reject(new Error(xhr.statusText));
                }
              };

              xhr.onerror = () => {
                setFiles((prev) =>
                  prev.map((f) =>
                    f.id === fileObj.id
                      ? {
                          ...f,
                          status: RawMediaStatusEnum.UPLOAD_FAILED,
                          error: "Upload failed",
                          rawMediaId: fileId,
                        }
                      : f
                  )
                );
                setError("Upload failed");
                onError?.(new Error("Upload failed"), fileObj.episodeId);
                reject(new Error("Upload failed"));
              };

              xhr.send(fileObj.file);
            });

            return {
              ...fileObj,
              status: RawMediaStatusEnum.UPLOAD_COMPLETED,
              progress: 100,
              url: url,
              rawMediaId: fileId,
            };
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Upload failed";
            return {
              ...fileObj,
              status: RawMediaStatusEnum.UPLOAD_FAILED,
              error: message,
            };
          }
        });

        // Wait for all uploads to complete
        const updatedFiles = await Promise.all(uploadPromises);

        // Update files state with results
        setFiles((prev) =>
          prev.map((f) => {
            const updated = updatedFiles.find((uf) => uf.id === f.id);
            return updated ? updated : f;
          })
        );

        // Check if any uploads failed
        const hasErrors = updatedFiles.some(
          (f) => f.status === RawMediaStatusEnum.UPLOAD_FAILED
        );
        setStatus(
          hasErrors
            ? RawMediaStatusEnum.UPLOAD_FAILED
            : RawMediaStatusEnum.UPLOAD_COMPLETED
        );

        // Call onUploadSuccess if all uploads completed successfully
        if (!hasErrors) {
          onUploadSuccess?.(updatedFiles);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        setError(message);
        setStatus(RawMediaStatusEnum.UPLOAD_FAILED);

        filesToUpload.forEach((file) => {
          onError?.(new Error(message), file.episodeId);
        });
      }
    },
    [onUploadStart, onUploadSuccess, onError, onUploadProgress]
  );

  return {
    files,
    status,
    error,
    addFiles,
    startUpload,
    removeFile,
    reset,
  };
}
