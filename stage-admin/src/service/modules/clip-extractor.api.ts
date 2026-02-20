"use client";

import {
  GetClipExtractorListResponse,
  ClipExtractorProjectDetail,
  ClipExtractorStatusResponse,
  CreateClipExtractorProjectRequest,
  CreateClipExtractorProjectResponse,
  StartClipExtractionResponse,
  CLIP_EXTRACTOR_TERMINAL_STATUSES,
} from "@/types/clip-extractor";
import { urlBuilder } from "@/utils/urlBuilder";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { endpoints } from "../endpoints";
import { privateApiService } from "../http";

export interface ClipExtractorQueryParams
  extends Record<string, string | number | boolean | undefined> {
  page?: number;
  perPage?: number;
  search?: string;
  sortOrder?: "asc" | "desc";
  status?: string;
}

export const clipExtractorApi = {
  getList: async (
    params?: ClipExtractorQueryParams
  ): Promise<GetClipExtractorListResponse> => {
    const url = urlBuilder.buildUrl<ClipExtractorQueryParams>(
      endpoints.clipExtractor.list,
      { queryParams: params }
    );
    const response = await privateApiService.get<GetClipExtractorListResponse>(url);
    return response.json();
  },

  create: async (
    payload: CreateClipExtractorProjectRequest
  ): Promise<CreateClipExtractorProjectResponse> => {
    const response = await privateApiService.post<CreateClipExtractorProjectResponse>(
      endpoints.clipExtractor.create,
      { json: payload }
    );
    return response.json();
  },

  getById: async (projectId: string): Promise<ClipExtractorProjectDetail> => {
    const response = await privateApiService.get<ClipExtractorProjectDetail>(
      endpoints.clipExtractor.getById(projectId)
    );
    return response.json();
  },

  getStatus: async (projectId: string): Promise<ClipExtractorStatusResponse> => {
    const response = await privateApiService.get<ClipExtractorStatusResponse>(
      endpoints.clipExtractor.status(projectId)
    );
    return response.json();
  },

  startExtraction: async (
    projectId: string
  ): Promise<StartClipExtractionResponse> => {
    const response = await privateApiService.post<StartClipExtractionResponse>(
      endpoints.clipExtractor.extract(projectId)
    );
    return response.json();
  },
};

// React Query Keys
export const clipExtractorKeys = {
  all: ["clip-extractor"] as const,
  lists: () => [...clipExtractorKeys.all, "list"] as const,
  list: (params?: ClipExtractorQueryParams) =>
    [...clipExtractorKeys.lists(), params] as const,
  details: () => [...clipExtractorKeys.all, "detail"] as const,
  detail: (id: string) => [...clipExtractorKeys.details(), id] as const,
  statuses: () => [...clipExtractorKeys.all, "status"] as const,
  status: (id: string) => [...clipExtractorKeys.statuses(), id] as const,
};

// Hooks
export function useClipExtractorList(params?: ClipExtractorQueryParams) {
  return useQuery({
    queryKey: clipExtractorKeys.list(params),
    queryFn: () => clipExtractorApi.getList(params),
  });
}

export function useClipExtractorDetail(projectId: string) {
  return useQuery({
    queryKey: clipExtractorKeys.detail(projectId),
    queryFn: () => clipExtractorApi.getById(projectId),
    enabled: !!projectId,
  });
}

export function useClipExtractorStatus(projectId: string, enabled = false) {
  return useQuery({
    queryKey: clipExtractorKeys.status(projectId),
    queryFn: () => clipExtractorApi.getStatus(projectId),
    enabled: enabled && !!projectId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && CLIP_EXTRACTOR_TERMINAL_STATUSES.includes(status as any)) {
        return false; // Stop polling
      }
      return 3000; // Poll every 3 seconds
    },
  });
}

export function useCreateClipExtractorProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clipExtractorApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clipExtractorKeys.lists() });
    },
  });
}

export function useStartClipExtraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clipExtractorApi.startExtraction,
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({
        queryKey: clipExtractorKeys.detail(projectId),
      });
    },
  });
}
