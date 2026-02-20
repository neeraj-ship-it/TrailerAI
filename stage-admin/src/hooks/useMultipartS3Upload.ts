import { RawMediaStatusEnum } from "@/types/videoQc";
import { useState, useCallback, useRef } from "react";
import { filesApi } from "@/service/modules/files.api";
import { UploadFile } from "./useS3Uploader";

interface UseMultipartS3UploadOptions {
  maxFileSize?: number;
  onUploadStart?: ({ fileId, url }: { fileId: string; url: string }) => void;
  onUploadSuccess?: (files: UploadFile[]) => void;
  onError?: (error: Error, episodeId?: string) => void;
  onUploadProgress?: (params: UploadProgressParams) => void;
}

const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 50 GB in bytes

interface MultipartUploadInfo {
  uploadUrl: string;
  rawMediaId: string;
  uploadId: string;
  partUrls: Array<{ partNumber: number; uploadUrl: string }>;
  bucket?: string;
  filePath?: string;
}

interface UploadProgressParams {
  fileId: string;
  uploadProgress: number;
  file: string;
  partProgress?: {
    partNumber: number;
    progress: number;
    totalParts: number;
  };
}

export function useMultipartS3Upload({
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  onUploadStart,
  onUploadSuccess,
  onError,
  onUploadProgress,
}: UseMultipartS3UploadOptions = {}) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [status, setStatus] = useState<RawMediaStatusEnum>(
    RawMediaStatusEnum.CREATED
  );
  const [error, setError] = useState<string | null>(null);
  const progressReportRef = useRef<
    Record<string, { lastPercent: number; lastTimestamp: number }>
  >({});

  const canReportProgress = useCallback(
    (fileId: string, uploadProgress: number) => {
      const now = Date.now();
      const entry = progressReportRef.current[fileId] ?? {
        lastPercent: -5,
        lastTimestamp: 0,
      };

      const percentDiff = uploadProgress - entry.lastPercent;
      const timeDiff = now - entry.lastTimestamp;
      const isFinal = uploadProgress >= 100;

      if (isFinal || (percentDiff >= 5 && timeDiff >= 3000)) {
        progressReportRef.current[fileId] = {
          lastPercent: uploadProgress,
          lastTimestamp: now,
        };
        return true;
      }

      return false;
    },
    []
  );

  const reportProgress = useCallback(
    (params: UploadProgressParams) => {
      if (!onUploadProgress) {
        return;
      }

      if (canReportProgress(params.fileId, params.uploadProgress)) {
        onUploadProgress(params);
      }
    },
    [canReportProgress, onUploadProgress]
  );

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

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => {
      prev.forEach((file) => {
        if (file.id === fileId && file.url?.startsWith("blob:")) {
          URL.revokeObjectURL(file.url);
        }
      });
      return prev.filter((f) => f.id !== fileId);
    });
  }, []);

  const reset = useCallback(() => {
    files.forEach((file) => {
      if (file.url?.startsWith("blob:")) {
        URL.revokeObjectURL(file.url);
      }
    });
    setFiles([]);
    setStatus(RawMediaStatusEnum.CREATED);
    setError(null);
    progressReportRef.current = {};
  }, [files]);

  const uploadPartWithRetry = async (
    file: File,
    fileId: string,
    partNumber: number,
    partUrl: string,
    startByte: number,
    endByte: number,
    onPartProgress?: (progress: number) => void,
    maxRetries: number = 3
  ): Promise<{ ETag: string; PartNumber: number }> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await new Promise((resolve, reject) => {
          const blob = file.slice(startByte, endByte);
          const xhr = new XMLHttpRequest();

          xhr.open("PUT", partUrl, true);

          // Set timeout to 10 minutes per part (large files need more time)
          xhr.timeout = 600000; // 10 minutes in milliseconds

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const partProgress = Math.round((event.loaded / event.total) * 100);
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === fileId ? { ...f, progress: partProgress } : f
                )
              );

              onPartProgress?.(partProgress);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const etag = xhr.getResponseHeader("ETag");
              if (!etag) {
                reject(new Error(`No ETag received for part ${partNumber}`));
                return;
              }
              onPartProgress?.(100);
              resolve({
                ETag: etag.replace(/"/g, ""),
                PartNumber: partNumber,
              });
            } else {
              reject(
                new Error(`Failed to upload part ${partNumber}: ${xhr.statusText}`)
              );
            }
          };

          xhr.onerror = () => {
            reject(new Error(`Network error uploading part ${partNumber}`));
          };

          xhr.ontimeout = () => {
            reject(new Error(`Upload timeout for part ${partNumber}`));
          };

          xhr.send(blob);
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Part ${partNumber} attempt ${attempt}/${maxRetries} failed:`, lastError.message);

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff: 2s, 4s, 8s)
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }
      }
    }

    throw new Error(`Failed to upload part ${partNumber} after ${maxRetries} attempts: ${lastError?.message}`);
  };

  const uploadPart = uploadPartWithRetry;

  const startUpload = useCallback(
    async (
      filesToUpload: UploadFile[],
      uploadInfos: Record<string, MultipartUploadInfo>
    ) => {
      setStatus(RawMediaStatusEnum.UPLOADING);
      setError(null);

      setFiles((prev) => {
        const existingFileIds = new Set(prev.map((f) => f.id));
        const filesToAdd = filesToUpload.filter(
          (f) =>
            !existingFileIds.has(f.id) &&
            f.status !== RawMediaStatusEnum.UPLOADING
        );

        const newFiles = filesToAdd.map((f) => ({
          ...f,
          progress: 0,
          status: RawMediaStatusEnum.UPLOADING,
        }));

        const updatedFiles = prev.map((f) => {
          const fileToUpload = filesToUpload.find((uf) => uf.id === f.id);
          if (fileToUpload) {
            return {
              ...f,
              progress: 0,
              status: RawMediaStatusEnum.UPLOADING,
            };
          }
          return f;
        });

        return [...updatedFiles, ...newFiles];
      });

      try {
        const uploadPromises = filesToUpload.map(async (fileObj) => {
          let completionPayload: UploadProgressParams | null = null;

          try {
            if (fileObj.file.size > maxFileSize) {
              const message = "File size exceeds the 5 GB limit";
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

            const uploadInfo = uploadInfos[fileObj.id];

            if (!uploadInfo) {
              throw new Error(
                `No upload info provided for file: ${fileObj.name}`
              );
            }

            const {
              uploadUrl,
              rawMediaId: fileId,
              uploadId,
              partUrls,
            } = uploadInfo;

            progressReportRef.current[fileId] = {
              lastPercent: -5,
              lastTimestamp: 0,
            };

            if (!uploadUrl || !fileId || !uploadId || !partUrls?.length) {
              throw new Error(`Invalid upload info for file: ${fileObj.name}`);
            }

            onUploadStart?.({ fileId, url: uploadUrl });

            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileObj.id
                  ? {
                      ...f,
                      progress: 0,
                      status: RawMediaStatusEnum.UPLOADING,
                      rawMediaId: fileId,
                      url: uploadUrl,
                    }
                  : f
              )
            );

            const fileSize = fileObj.file.size;
            const partSize = Math.ceil(fileSize / partUrls.length);

            const uploadedParts: Array<{
              ETag: string;
              PartNumber: number;
            }> = [];

            // Track progress for each part
            const partProgressMap = new Map<number, number>();
            partUrls.forEach((part) => {
              partProgressMap.set(part.partNumber, 0);
            });

            const calculateOverallProgress = (): number => {
              let totalBytesUploaded = 0;
              partUrls.forEach((part, index) => {
                const partProgress = partProgressMap.get(part.partNumber) || 0;
                const startByte = index * partSize;
                const endByte = Math.min(startByte + partSize, fileSize);
                const partBytes = endByte - startByte;
                totalBytesUploaded += (partProgress / 100) * partBytes;
              });
              return Math.round((totalBytesUploaded / fileSize) * 100);
            };

            for (let i = 0; i < partUrls.length; i++) {
              const part = partUrls[i];
              const startByte = i * partSize;
              const endByte = Math.min(startByte + partSize, fileSize);

              try {
                const partResult = await uploadPart(
                  fileObj.file,
                  fileObj.id,
                  part.partNumber,
                  part.uploadUrl,
                  startByte,
                  endByte,
                  (partProgressPercent) => {
                    partProgressMap.set(part.partNumber, partProgressPercent);
                    const overallProgress = calculateOverallProgress();

                    setFiles((prev) =>
                      prev.map((f) =>
                        f.id === fileObj.id
                          ? {
                              ...f,
                              progress: overallProgress,
                              status: RawMediaStatusEnum.UPLOADING,
                              rawMediaId: fileId,
                              url: uploadUrl,
                            }
                          : f
                      )
                    );

                    // Call progress callback with part information
                    reportProgress({
                      fileId,
                      uploadProgress: overallProgress,
                      file: fileObj.episodeId || "",
                      partProgress: {
                        partNumber: part.partNumber,
                        progress: partProgressPercent,
                        totalParts: partUrls.length,
                      },
                    });
                  }
                );

                uploadedParts.push(partResult);
              } catch (partError) {
                throw new Error(
                  `Failed to upload part ${part.partNumber}: ${
                    partError instanceof Error
                      ? partError.message
                      : "Unknown error"
                  }`
                );
              }
            }

            uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber);

            // Use trailer-specific completion if bucket and filePath are provided
            if (uploadInfo.bucket && uploadInfo.filePath) {
              const { trailerApi } = await import("@/service/modules/trailer.api");
              await trailerApi.completeMultipartUpload({
                bucket: uploadInfo.bucket,
                filePath: uploadInfo.filePath,
                parts: uploadedParts,
                rawMediaId: fileId,
                uploadId,
              });
            } else {
              // Use generic completion for other uploads
              await filesApi.completeMultipartUpload({
                parts: uploadedParts,
                rawMediaId: fileId,
                uploadId,
              });
            }

            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileObj.id
                  ? {
                      ...f,
                      status: RawMediaStatusEnum.UPLOAD_COMPLETED,
                      progress: 100,
                      url: uploadUrl,
                      rawMediaId: fileId,
                    }
                  : f
              )
            );

            completionPayload = {
              fileId,
              uploadProgress: 100,
              file: fileObj.episodeId || "",
            };

            return {
              ...fileObj,
              status: RawMediaStatusEnum.UPLOAD_COMPLETED,
              progress: 100,
              url: uploadUrl,
              rawMediaId: fileId,
            };
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Upload failed";
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
          } finally {
            if (completionPayload) {
              reportProgress(completionPayload);
            }
          }
        });

        const updatedFiles = await Promise.all(uploadPromises);

        setFiles((prev) =>
          prev.map((f) => {
            const updated = updatedFiles.find((uf) => uf.id === f.id);
            return updated ? updated : f;
          })
        );

        const hasErrors = updatedFiles.some(
          (f) => f.status === RawMediaStatusEnum.UPLOAD_FAILED
        );
        setStatus(
          hasErrors
            ? RawMediaStatusEnum.UPLOAD_FAILED
            : RawMediaStatusEnum.UPLOAD_COMPLETED
        );

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
    [maxFileSize, onUploadStart, onUploadSuccess, onError, reportProgress]
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
