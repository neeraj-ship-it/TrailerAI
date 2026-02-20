"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { videoQcFormSchema, VideoQcFormValues } from "@/schemas/videoQc.schema";
import {
  useCreateVideoQcMutation,
  videoQcApi,
} from "@/service/modules/videoQc.api";
import { useToast } from "@/hooks/useToast";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useEffect } from "react";
import { useMultipartS3Upload } from "@/hooks/useMultipartS3Upload";
import { RawMediaStatusEnum } from "@/types/videoQc";
import {
  useGenerateVideoQcUploadUrl,
  GenerateVideoUploadUrlPayload,
  GenerateQcVideoUploadUrlRequestDto,
  GenerateQcVideoUploadUrlResponseDto,
} from "@/hooks/useUploadVideo.mutation";

interface UseVideoQcFormOptions {
  initialValues?: {
    projectId?: string;
  };
  isEditMode?: boolean;
}

export const useVideoQcForm = (options?: UseVideoQcFormOptions) => {
  const { toast } = useToast();
  const router = useRouter();
  const createMutation = useCreateVideoQcMutation();
  const projectIdRef = useRef<string>(options?.initialValues?.projectId || "");
  const uploadInfoRef = useRef<{
    rawMediaId: string;
    videoUrl: string;
  } | null>(null);
  const isEditMode = options?.isEditMode ?? false;

  const form = useForm<VideoQcFormValues>({
    resolver: zodResolver(videoQcFormSchema),
    defaultValues: {
      projectId: options?.initialValues?.projectId || "",
      videoFile: undefined,
    },
  });

  useEffect(() => {
    if (options?.initialValues?.projectId) {
      form.setValue("projectId", options.initialValues.projectId);
      projectIdRef.current = options.initialValues.projectId;
    }
  }, [options?.initialValues?.projectId, form]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "projectId" && value.projectId) {
        projectIdRef.current = value.projectId;
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const uploadProgressHandler = async ({
    uploadProgress,
  }: {
    uploadProgress: number;
  }) => {
    const uploadInfo = uploadInfoRef.current;
    if (!uploadInfo || !projectIdRef.current) return;

    try {
      await videoQcApi.reportUploadProgress({
        progress: uploadProgress,
        projectId: projectIdRef.current,
        rawMediaId: uploadInfo.rawMediaId,
        status:
          uploadProgress === 100
            ? RawMediaStatusEnum.UPLOAD_COMPLETED
            : RawMediaStatusEnum.UPLOADING,
        videoUrl: uploadInfo.videoUrl,
      });
    } catch (error) {
      console.error("Error reporting upload progress:", error);
    }
  };

  const uploadSuccessHandler = async () => {
    const uploadInfo = uploadInfoRef.current;
    if (!uploadInfo || !projectIdRef.current) return;

    try {
      await videoQcApi.reportUploadProgress({
        progress: 100,
        projectId: projectIdRef.current,
        rawMediaId: uploadInfo.rawMediaId,
        status: RawMediaStatusEnum.UPLOAD_COMPLETED,
        videoUrl: uploadInfo.videoUrl,
      });
    } catch (error) {
      console.error("Error reporting final upload progress:", error);
    }
  };

  const uploadErrorHandler = async () => {
    const uploadInfo = uploadInfoRef.current;
    if (!uploadInfo || !projectIdRef.current) return;

    try {
      await videoQcApi.reportUploadProgress({
        progress: 0,
        projectId: projectIdRef.current,
        rawMediaId: uploadInfo.rawMediaId,
        status: RawMediaStatusEnum.UPLOAD_FAILED,
        videoUrl: uploadInfo.videoUrl,
      });
    } catch (reportError) {
      console.error("Error reporting failed upload progress:", reportError);
    }
  };

  const multipartS3Uploader = useMultipartS3Upload({
    onUploadProgress: uploadProgressHandler,
    onUploadSuccess: uploadSuccessHandler,
    onError: uploadErrorHandler,
  });

  const generateUploadUrlMutation = useGenerateVideoQcUploadUrl();

  const generateUploadUrl = useCallback(
    async (
      payload: GenerateVideoUploadUrlPayload
    ): Promise<{
      fileId: string;
      url: string;
      rawMediaId: string;
      uploadUrl: string;
      uploadId?: string;
      partUrls?: Array<{ partNumber: number; uploadUrl: string }>;
    }> => {
      if (multipartS3Uploader.files.length > 1) {
        throw new Error("Only one file can be uploaded at a time");
      }

      if (!projectIdRef.current) {
        throw new Error("Project ID is required");
      }

      if (multipartS3Uploader.files.length === 0) {
        throw new Error("No file selected");
      }

      const file = multipartS3Uploader.files[0];
      const qcPayload: GenerateQcVideoUploadUrlRequestDto = {
        fileExtension: payload.fileExtension,
        fileName: file.name,
        fileSize: file.file.size,
        mimeType: payload.mimeType,
        projectId: projectIdRef.current,
      };

      const result: GenerateQcVideoUploadUrlResponseDto =
        await generateUploadUrlMutation(qcPayload);

      uploadInfoRef.current = {
        rawMediaId: result.rawMediaId,
        videoUrl: result.viewUrl,
      };

      return {
        fileId: file.id,
        url: result.viewUrl,
        rawMediaId: result.rawMediaId,
        uploadUrl: result.uploadUrl,
        uploadId: result.uploadId,
        partUrls: result.partUrls,
      };
    },
    [generateUploadUrlMutation, multipartS3Uploader.files]
  );

  const handleSubmit = useCallback(
    async (values: VideoQcFormValues) => {
      try {
        projectIdRef.current = values.projectId;

        await createMutation.mutateAsync({
          projectId: values.projectId,
        });

        toast({
          variant: "default",
          title: "Success",
          description: "Video QC created successfully",
        });
        router.push("/video-qc");
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create video QC. Please try again.",
        });
        console.error("Error creating video QC:", error);
      }
    },
    [createMutation, toast, router]
  );

  return {
    form,
    handleSubmit: form.handleSubmit(handleSubmit),
    isLoading: createMutation.isPending,
    multipartS3Uploader,
    generateUploadUrl,
    isEditMode,
  };
};
