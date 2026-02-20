"use client";

import { DialectEnum } from "@/types/common";
import {
  PlatterContentResponse,
  PlatterContentTypeEnum,
  PlatterItem,
  PlatterTypeEnum,
} from "@/types/platter";
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { endpoints } from "../endpoints";
import { privateApiService } from "../http";

export interface PlatterPayload {
  contents: {
    slug: string;
    type: PlatterContentTypeEnum;
  }[];
  dialect: DialectEnum;
  platterType: PlatterTypeEnum;
}

export interface PlatterResponse {
  items: PlatterItem[];
}

export const platterApi = {
  getContent: (parameter: string) => {
    return privateApiService.get<PlatterContentResponse>(
      `${endpoints.platter.getContent}/${parameter}`
    );
  },
  updatePlatter: (platter: PlatterPayload) => {
    return privateApiService.post<PlatterPayload>(
      endpoints.platter.updatePlatter,
      {
        body: JSON.stringify(platter),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  },
  getPlatter: async ({
    dialect,
    type,
  }: {
    dialect: DialectEnum;
    type: PlatterTypeEnum;
  }): Promise<{
    res: PlatterResponse;
    type: PlatterTypeEnum;
  }> => {
    const response = await privateApiService.get<PlatterResponse>(
      `${endpoints.platter.getPlatter}/${type}/${dialect}`
    );
    const res = await response.json();
    return {
      res,
      type,
    };
  },
};

export const usePlatterContentQuery = (parameter: string) => {
  return useQuery({
    queryKey: ["platter-content", parameter],
    queryFn: async () => {
      const response = await platterApi.getContent(parameter);
      return response.json();
    },
    enabled: !!parameter, // Only run query if parameter is provided
  });
};

export const useUpdatePlatterMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (platter: PlatterPayload) => {
      const response = await platterApi.updatePlatter(platter);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["platter", variables.dialect, variables.platterType],
      });
    },
    onError: (error) => {
      console.error("Mutation failed:", error);
    },
  });
};

export const usePlatterQuery = (
  payload: {
    dialect: DialectEnum;
    type: PlatterTypeEnum;
  },
  options?: Omit<
    UseQueryOptions<Awaited<ReturnType<typeof platterApi.getPlatter>>>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["platter", payload.dialect, payload.type],
    queryFn: () => platterApi.getPlatter(payload),
    ...options,
  });
};
