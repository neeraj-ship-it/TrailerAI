"use client";

import { privateApiService } from "../http";
import { endpoints } from "../endpoints";

export interface CompleteMultipartUploadRequest {
  parts: Array<{ ETag: string; PartNumber: number }>;
  rawMediaId: string;
  uploadId: string;
}

export interface CompleteMultipartUploadResponse {
  location: string;
}

export const filesApi = {
  completeMultipartUpload: async (
    payload: CompleteMultipartUploadRequest
  ): Promise<CompleteMultipartUploadResponse> => {
    try {
      const response = await privateApiService
        .post<CompleteMultipartUploadResponse>(
          endpoints.files.completeMultipartUpload,
          {
            json: payload,
          }
        )
        .json();

      return response;
    } catch (error) {
      console.error("Error completing multipart upload:", error);
      throw error;
    }
  },
};
