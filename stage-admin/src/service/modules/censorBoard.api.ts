"use client";

import { DialectEnum } from "@/types/common";
import { PlatterContentTypeEnum } from "@/types/platter";
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { endpoints } from "../endpoints";
import { privateApiService } from "../http";

export interface CensorBoardContentItem {
  slug: string;
  contentType: PlatterContentTypeEnum;
  isAudienceAdded: boolean;
  title: string;
  thumbnail: string;
}

export interface CensorBoardListContentsParams {
  dialect: DialectEnum;
  contentType?: PlatterContentTypeEnum;
}

export interface AddUsersToContentParams {
  slug: string;
  users: string[];
  dialect: DialectEnum;
  type: PlatterContentTypeEnum;
}

export interface ExportAudienceParams {
  slug: string;
  dialect: DialectEnum;
  type: PlatterContentTypeEnum;
}

export const censorBoardApi = {
  listContents: async (
    params: CensorBoardListContentsParams
  ): Promise<CensorBoardContentItem[]> => {
    const searchParams = new URLSearchParams();

    if (params.contentType) {
      searchParams.append("contentType", params.contentType);
    }

    const response = await privateApiService.get<CensorBoardContentItem[]>(
      `${endpoints.censorBoard.listContents}/${
        params.dialect
      }?${searchParams.toString()}`
    );
    return response.json();
  },
};

export const useCensorBoardListContentsQuery = (
  params: CensorBoardListContentsParams,
  options?: Omit<
    UseQueryOptions<CensorBoardContentItem[]>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["censorBoard", "listContents", params],
    queryFn: () => censorBoardApi.listContents(params),
    ...options,
  });
};

export const addUsersToContent = async (
  params: AddUsersToContentParams
): Promise<void> => {
  await privateApiService.post(
    `${endpoints.censorBoard.base}/${params.slug}/add-audience`,
    {
      json: params,
    }
  );
};

export const useAddUsersToContentMutation = (
  options?: Omit<
    UseMutationOptions<void, Error, AddUsersToContentParams>,
    "mutationFn"
  >
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addUsersToContent,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["censorBoard", "listContents"],
      });
    },
    ...options,
  });
};

export const exportAudience = async (
  params: ExportAudienceParams
): Promise<string[]> => {
  const response = await privateApiService.get(
    `${endpoints.censorBoard.base}/${params.slug}/export-audience?dialect=${params.dialect}&type=${params.type}`
  );
  return response.json();
};
