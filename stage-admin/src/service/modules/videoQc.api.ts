"use client";

import {
  GetVideoQcListResponse,
  RawMediaStatusEnum,
  VideoQcDetail,
  VideoQcItem,
  VideoQcProgressResponse,
  VideoQcStatusEnum,
} from "@/types/videoQc";
import { urlBuilder } from "@/utils/urlBuilder";
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { endpoints } from "../endpoints";
import { privateApiService } from "../http";

export interface VideoQcQueryParams
  extends Record<string, string | number | boolean | undefined> {
  page?: number;
  perPage?: number;
}

export interface CreateVideoQcPayload {
  projectId: string;
}

export interface InitiateVideoQcPayload {
  projectId: string;
}

export interface VideoQcEventResponse {
  qcRequestId: string;
  rawMediaId: string;
  requestedAt: number;
  topic: string;
}

export interface ReportUploadProgressPayload {
  progress: number;
  projectId: string;
  rawMediaId: string;
  status: RawMediaStatusEnum;
  videoUrl: string;
}

export const videoQcApi = {
  getList: async (
    params?: VideoQcQueryParams
  ): Promise<GetVideoQcListResponse> => {
    try {
      const url = urlBuilder.buildUrl<VideoQcQueryParams>(
        endpoints.videoQc.list,
        {
          queryParams: params,
        }
      );

      const response = await privateApiService.get<GetVideoQcListResponse>(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return data;
    } catch (error) {
      console.error("Error fetching video QC data:", error);
      throw error;
    }
  },
  create: async (payload: CreateVideoQcPayload): Promise<VideoQcItem> => {
    try {
      const response = await privateApiService.post<VideoQcItem>(
        endpoints.videoQc.list,
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
      console.error("Error creating video QC:", error);
      throw error;
    }
  },
  reportUploadProgress: async (
    payload: ReportUploadProgressPayload
  ): Promise<void> => {
    try {
      const response = await privateApiService.post(
        endpoints.videoQc.reportUploadProgress,
        {
          json: payload,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error reporting upload progress:", error);
      throw error;
    }
  },
  initiate: async (
    payload: InitiateVideoQcPayload
  ): Promise<VideoQcEventResponse> => {
    try {
      const response = await privateApiService.post<VideoQcItem>(
        endpoints.videoQc.initiate,
        {
          json: payload,
        }
      );

      return response.json();
    } catch (error) {
      console.error("Error initiating video QC:", error);
      throw error;
    }
  },
  getProgress: async (projectId: string): Promise<VideoQcProgressResponse> => {
    try {
      const response = await privateApiService.get<VideoQcProgressResponse>(
        endpoints.videoQc.progress(projectId)
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error("Error fetching video QC progress:", error);
      throw error;
    }
  },
  getById: async (id: string): Promise<VideoQcDetail> => {
    try {
      const response = await privateApiService.get<VideoQcDetail>(
        endpoints.videoQc.getById(id)
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error("Error fetching video QC detail:", error);
      throw error;
    }
  },
};

export const useVideoQcListQuery = (
  params?: VideoQcQueryParams,
  options?: Omit<
    UseQueryOptions<GetVideoQcListResponse>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["videoQc", "list", params],
    queryFn: async () => {
      const response = await videoQcApi.getList(params);
      return response;
    },
    ...options,
  });
};

export const useCreateVideoQcMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateVideoQcPayload) => {
      return await videoQcApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["videoQc", "list"],
      });
    },
  });
};

export const useInitiateVideoQcMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: InitiateVideoQcPayload) => {
      return await videoQcApi.initiate(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["videoQc", "detail"],
      });
      queryClient.invalidateQueries({
        queryKey: ["videoQc", "list"],
      });
    },
  });
};

export const useVideoQcDetailQuery = (
  id: string | undefined,
  options?: Omit<UseQueryOptions<VideoQcDetail>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: ["videoQc", "detail", id],
    queryFn: async () => {
      if (!id) {
        throw new Error("ID is required");
      }
      return await videoQcApi.getById(id);
    },
    ...options,
  });
};

export interface UseVideoQcProgressQueryOptions
  extends Omit<
    UseQueryOptions<VideoQcProgressResponse>,
    "queryKey" | "queryFn"
  > {
  onData?: (data: VideoQcProgressResponse) => void;
}

export const useVideoQcProgressQuery = (
  projectId: string | undefined,
  options?: UseVideoQcProgressQueryOptions
) => {
  const { onData, ...queryOptions } = options || {};

  return useQuery({
    queryKey: ["videoQc", "progress", projectId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error("Project ID is required");
      }
      const data = await videoQcApi.getProgress(projectId);

      if (onData) {
        onData(data);
      }

      return data;
    },
    enabled:
      !!projectId &&
      (queryOptions?.enabled !== undefined ? queryOptions.enabled : true),
    refetchInterval: (query) => {
      const data = query.state.data as VideoQcProgressResponse | undefined;
      if (
        data?.qcStatus === VideoQcStatusEnum.PENDING ||
        data?.qcStatus === VideoQcStatusEnum.PROCESSING
      ) {
        return 2000;
      }
      return false;
    },
    ...queryOptions,
  });
};
