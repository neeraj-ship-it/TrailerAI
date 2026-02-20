"use client";

import {
  GetTrailerListResponse,
  TrailerProjectDetail,
  TrailerStatusResponse,
  CreateTrailerProjectRequest,
  CreateTrailerProjectResponse,
  GenerateTrailerRequest,
  GenerateTrailerResponse,
  TrailerUploadProgressRequest,
  TrailerCompleteMultipartUploadRequest,
  CreateTrailerUploadUrlRequest,
  CreateTrailerUploadUrlResponse,
  TERMINAL_STATUSES,
} from "@/types/trailer";
import { urlBuilder } from "@/utils/urlBuilder";
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { endpoints } from "../endpoints";
import { privateApiService } from "../http";

export interface TrailerQueryParams
  extends Record<string, string | number | boolean | undefined> {
  page?: number;
  perPage?: number;
  search?: string;
  sortOrder?: "asc" | "desc";
  contentSlug?: string;
}

export const trailerApi = {
  getList: async (
    params?: TrailerQueryParams
  ): Promise<GetTrailerListResponse> => {
    try {
      const url = urlBuilder.buildUrl<TrailerQueryParams>(
        endpoints.trailer.list,
        {
          queryParams: params,
        }
      );

      const response = await privateApiService.get<GetTrailerListResponse>(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching trailer projects:", error);
      throw error;
    }
  },

  create: async (
    payload: CreateTrailerProjectRequest
  ): Promise<CreateTrailerProjectResponse> => {
    try {
      const response = await privateApiService.post<CreateTrailerProjectResponse>(
        endpoints.trailer.create,
        {
          json: payload,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error creating trailer project:", error);
      throw error;
    }
  },

  getById: async (projectId: string): Promise<TrailerProjectDetail> => {
    try {
      const response = await privateApiService.get<TrailerProjectDetail>(
        endpoints.trailer.getById(projectId)
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error("Error fetching trailer project detail:", error);
      throw error;
    }
  },

  getStatus: async (projectId: string): Promise<TrailerStatusResponse> => {
    try {
      const response = await privateApiService.get<TrailerStatusResponse>(
        endpoints.trailer.status(projectId)
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error("Error fetching trailer status:", error);
      throw error;
    }
  },

  generate: async (
    payload: GenerateTrailerRequest
  ): Promise<GenerateTrailerResponse> => {
    try {
      const response = await privateApiService.post<GenerateTrailerResponse>(
        endpoints.trailer.generate,
        {
          json: payload,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error("Error generating trailer:", error);
      throw error;
    }
  },

  reportUploadProgress: async (
    payload: TrailerUploadProgressRequest
  ): Promise<void> => {
    try {
      const response = await privateApiService.post(
        endpoints.trailer.reportUploadProgress,
        {
          json: payload,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error reporting trailer upload progress:", error);
      throw error;
    }
  },

  completeMultipartUpload: async (
    payload: TrailerCompleteMultipartUploadRequest
  ): Promise<void> => {
    try {
      const response = await privateApiService.post(
        endpoints.trailer.completeMultipartUpload,
        {
          json: payload,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error completing trailer multipart upload:", error);
      throw error;
    }
  },

  generateUploadUrl: async (
    payload: CreateTrailerUploadUrlRequest
  ): Promise<CreateTrailerUploadUrlResponse> => {
    try {
      const response = await privateApiService.post<CreateTrailerUploadUrlResponse>(
        endpoints.trailer.generateUploadUrl,
        {
          json: payload,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error("Error generating trailer upload URL:", error);
      throw error;
    }
  },

  // NEW: Narrative workflow APIs
  draftNarrative: async (
    payload: GenerateTrailerRequest
  ): Promise<{ status: string; message: string; projectId: string }> => {
    try {
      const response = await privateApiService.post(
        endpoints.trailer.draftNarrative,
        {
          json: payload,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error("Error drafting narrative:", error);
      throw error;
    }
  },

  getNarrativeDraft: async (
    projectId: string
  ): Promise<{ draft: Record<string, unknown>; status: string } | null> => {
    try {
      const response = await privateApiService.get(
        endpoints.trailer.getNarrative(projectId)
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error("Error fetching narrative draft:", error);
      throw error;
    }
  },

  approveNarrative: async (payload: {
    projectId: string;
    approvedNarrative: Record<string, unknown>;
    modifications?: Record<string, unknown>;
  }): Promise<GenerateTrailerResponse> => {
    try {
      const response = await privateApiService.post<GenerateTrailerResponse>(
        endpoints.trailer.approveNarrative,
        {
          json: payload,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error("Error approving narrative:", error);
      throw error;
    }
  },

  getNarrativeStatus: async (
    projectId: string
  ): Promise<{ status: string; phase: string; message?: string }> => {
    try {
      const response = await privateApiService.get(
        endpoints.trailer.narrativeStatus(projectId)
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error("Error fetching narrative status:", error);
      throw error;
    }
  },
};

// React Query Hooks

export const useTrailerListQuery = (
  params?: TrailerQueryParams,
  options?: Omit<
    UseQueryOptions<GetTrailerListResponse>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["trailer", "list", params],
    queryFn: async () => {
      const response = await trailerApi.getList(params);
      return response;
    },
    ...options,
  });
};

export const useCreateTrailerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTrailerProjectRequest) => {
      return await trailerApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["trailer", "list"],
      });
    },
  });
};

export const useTrailerDetailQuery = (
  projectId: string | undefined,
  options?: Omit<UseQueryOptions<TrailerProjectDetail>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: ["trailer", "detail", projectId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error("Project ID is required");
      }
      return await trailerApi.getById(projectId);
    },
    enabled: !!projectId,
    ...options,
  });
};

export interface UseTrailerStatusQueryOptions
  extends Omit<
    UseQueryOptions<TrailerStatusResponse>,
    "queryKey" | "queryFn"
  > {
  onData?: (data: TrailerStatusResponse) => void;
}

export const useTrailerStatusQuery = (
  projectId: string | undefined,
  options?: UseTrailerStatusQueryOptions
) => {
  const { onData, ...queryOptions } = options || {};
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["trailer", "status", projectId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error("Project ID is required");
      }
      const data = await trailerApi.getStatus(projectId);

      if (onData) {
        onData(data);
      }

      // If status is terminal, invalidate detail queries to fetch latest data
      if (data?.status && TERMINAL_STATUSES.includes(data.status)) {
        queryClient.invalidateQueries({
          queryKey: ["trailer", "detail", projectId],
        });
        queryClient.invalidateQueries({
          queryKey: ["trailer", "list"],
        });
      }

      return data;
    },
    enabled:
      !!projectId &&
      (queryOptions?.enabled !== undefined ? queryOptions.enabled : true),
    refetchInterval: (query) => {
      const data = query.state.data as TrailerStatusResponse | undefined;
      // Stop polling if status is a terminal state (complete, failed, idle)
      if (data?.status && TERMINAL_STATUSES.includes(data.status)) {
        return false;
      }
      return 2000; // Poll every 2 seconds while processing
    },
    ...queryOptions,
  });
};

export const useGenerateTrailerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: GenerateTrailerRequest) => {
      return await trailerApi.generate(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["trailer", "detail"],
      });
      queryClient.invalidateQueries({
        queryKey: ["trailer", "list"],
      });
    },
  });
};

export const useGenerateTrailerUploadUrl = () => {
  const mutation = useMutation({
    mutationFn: trailerApi.generateUploadUrl,
  });
  return mutation.mutateAsync;
};

// NEW: Narrative workflow hooks

export const useDraftNarrativeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: GenerateTrailerRequest) => {
      return await trailerApi.draftNarrative(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["trailer", "detail"],
      });
    },
  });
};

export const useNarrativeDraftQuery = (
  projectId: string | undefined,
  options?: Omit<UseQueryOptions<{ draft: Record<string, unknown>; status: string } | null>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: ["trailer", "narrative", projectId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error("Project ID is required");
      }
      return await trailerApi.getNarrativeDraft(projectId);
    },
    enabled: !!projectId,
    ...options,
  });
};

export const useApproveNarrativeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      projectId: string;
      approvedNarrative: Record<string, unknown>;
      modifications?: Record<string, unknown>;
    }) => {
      return await trailerApi.approveNarrative(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["trailer", "detail"],
      });
      queryClient.invalidateQueries({
        queryKey: ["trailer", "list"],
      });
    },
  });
};

export const useNarrativeStatusQuery = (
  projectId: string | undefined,
  options?: Omit<
    UseQueryOptions<{ status: string; phase: string; message?: string }>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["trailer", "narrative-status", projectId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error("Project ID is required");
      }
      return await trailerApi.getNarrativeStatus(projectId);
    },
    enabled: !!projectId,
    refetchInterval: (query) => {
      const data = query.state.data as { status: string } | undefined;
      // Stop polling if narrative is ready or trailer is complete
      if (data?.status === 'ready' || data?.status === 'completed') {
        return false;
      }
      return 3000; // Poll every 3 seconds while processing
    },
    ...options,
  });
};
