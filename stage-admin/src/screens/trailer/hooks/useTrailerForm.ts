"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { trailerFormSchema, TrailerFormValues } from "@/schemas/trailer.schema";
import {
  useCreateTrailerMutation,
  trailerApi,
  useGenerateTrailerUploadUrl,
} from "@/service/modules/trailer.api";
import { useToast } from "@/hooks/useToast";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useEffect } from "react";
import { useMultipartS3Upload } from "@/hooks/useMultipartS3Upload";
import { TrailerUploadStatusEnum, CreateTrailerUploadUrlRequest } from "@/types/trailer";

interface UseTrailerFormOptions {
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
}

export const useTrailerForm = (options?: UseTrailerFormOptions) => {
  const { toast } = useToast();
  const router = useRouter();
  const createMutation = useCreateTrailerMutation();
  const projectIdRef = useRef<string>(options?.initialValues?.projectId || "");
  const uploadInfoRef = useRef<{
    rawMediaId: string;
    videoUrl: string;
  } | null>(null);
  const isEditMode = options?.isEditMode ?? false;

  const form = useForm<TrailerFormValues>({
    resolver: zodResolver(trailerFormSchema),
    defaultValues: {
      projectId: options?.initialValues?.projectId || "",
      contentSlug: options?.initialValues?.contentSlug || "",
      contentMetadata: options?.initialValues?.contentMetadata || {
        title: "",
        genre: "",
        language: "en",
        targetDuration: 90,
      },
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
      await trailerApi.reportUploadProgress({
        progress: uploadProgress,
        projectId: projectIdRef.current,
        rawMediaId: uploadInfo.rawMediaId,
        status:
          uploadProgress === 100
            ? TrailerUploadStatusEnum.UPLOAD_COMPLETED
            : TrailerUploadStatusEnum.UPLOADING,
      });
    } catch (error) {
      console.error("Error reporting upload progress:", error);
    }
  };

  const uploadSuccessHandler = async () => {
    const uploadInfo = uploadInfoRef.current;
    if (!uploadInfo || !projectIdRef.current) return;

    try {
      await trailerApi.reportUploadProgress({
        progress: 100,
        projectId: projectIdRef.current,
        rawMediaId: uploadInfo.rawMediaId,
        status: TrailerUploadStatusEnum.UPLOAD_COMPLETED,
      });
    } catch (error) {
      console.error("Error reporting final upload progress:", error);
    }
  };

  const uploadErrorHandler = async () => {
    const uploadInfo = uploadInfoRef.current;
    if (!uploadInfo || !projectIdRef.current) return;

    try {
      await trailerApi.reportUploadProgress({
        progress: 0,
        projectId: projectIdRef.current,
        rawMediaId: uploadInfo.rawMediaId,
        status: TrailerUploadStatusEnum.UPLOAD_FAILED,
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

  const generateUploadUrlMutation = useGenerateTrailerUploadUrl();

  const generateUploadUrl = useCallback(
    async (payload: {
      fileExtension: string;
      mimeType: string;
    }): Promise<{
      fileId: string;
      url: string;
      rawMediaId: string;
      uploadUrl: string;
      uploadId?: string;
      partUrls?: Array<{ partNumber: number; uploadUrl: string }>;
      bucket?: string;
      filePath?: string;
    }> => {
      if (multipartS3Uploader.files.length > 1) {
        throw new Error("Only one file can be uploaded at a time");
      }

      if (!projectIdRef.current) {
        throw new Error("Please enter a Project ID in Step 1 before uploading");
      }

      if (multipartS3Uploader.files.length === 0) {
        throw new Error("No file selected. Please select a video file first.");
      }

      const file = multipartS3Uploader.files[0];
      const trailerPayload: CreateTrailerUploadUrlRequest = {
        fileName: file.name,
        fileSize: file.file.size,
        mimeType: payload.mimeType,
        projectId: projectIdRef.current,
      };

      const result = await generateUploadUrlMutation(trailerPayload);

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
        bucket: result.bucket,
        filePath: result.filePath,
      };
    },
    [generateUploadUrlMutation, multipartS3Uploader.files]
  );

  const handleSubmit = useCallback(
    async (values: TrailerFormValues) => {
      try {
        projectIdRef.current = values.projectId;

        await createMutation.mutateAsync({
          projectId: values.projectId,
          contentSlug: values.contentSlug,
          contentMetadata: values.contentMetadata,
        });

        toast({
          variant: "default",
          title: "Success",
          description: "Trailer project created successfully",
        });
        router.push("/trailer");
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create trailer project. Please try again.",
        });
        console.error("Error creating trailer project:", error);
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
    uploadInfoRef,
  };
};
