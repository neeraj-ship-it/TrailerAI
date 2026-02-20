"use client";

import { useMutation } from "@tanstack/react-query";
import { privateApiService } from "@/service/http";
import { endpoints } from "@/service/endpoints";
import { ContentTypeEnum } from "@/types/variant";
import { urlBuilder } from "@/utils/urlBuilder";

export interface GenerateVideoUploadUrlPayload {
  fileExtension: string;
  mimeType: string;
  duration: number;
  contentType: ContentTypeEnum;
  contentSlug: string;
}

export interface GenerateQcVideoUploadUrlRequestDto {
  fileExtension: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  projectId: string;
}

export interface GenerateQcVideoUploadUrlResponseDto {
  rawMediaId: string;
  uploadId?: string;
  uploadUrl: string;
  partUrls?: Array<{ partNumber: number; uploadUrl: string }>;
  viewUrl: string;
}

interface GenerateVideoUploadUrlResponse {
  fileId: string;
  url: string;
  rawMediaId: string;
  uploadUrl: string;
  uploadId?: string;
  partUrls?: Array<{ partNumber: number; uploadUrl: string }>;
}

async function generateVideoUploadUrl(
  payload: GenerateVideoUploadUrlPayload
): Promise<GenerateVideoUploadUrlResponse> {
  const endpoint = endpoints.files.generateVideoUploadUrl(payload.contentType);

  try {
    const response = await privateApiService
      .post<GenerateVideoUploadUrlResponse>(endpoint, {
        json: payload,
      })
      .json();

    return {
      ...response,
      rawMediaId: response.rawMediaId,
      uploadUrl: response.uploadUrl,
    };
  } catch (error) {
    console.error("[ERROR] Failed to generate video upload URL:", error);
    throw error;
  }
}

async function generateVideoQcUploadUrl(
  payload: GenerateQcVideoUploadUrlRequestDto
): Promise<GenerateQcVideoUploadUrlResponseDto> {
  const endpoint = urlBuilder.buildUrl(endpoints.files.generateUploadUrl);

  try {
    const response = await privateApiService
      .post<GenerateQcVideoUploadUrlResponseDto>(endpoint, {
        json: payload,
      })
      .json();

    return response;
  } catch (error) {
    console.error("[ERROR] Failed to generate video QC upload URL:", error);
    throw error;
  }
}

export function useGenerateVideoQcUploadUrl() {
  const mutation = useMutation({ mutationFn: generateVideoQcUploadUrl });
  return mutation.mutateAsync;
}

export function useUploadVideo() {
  const mutation = useMutation({ mutationFn: generateVideoUploadUrl });
  return mutation.mutateAsync;
}
