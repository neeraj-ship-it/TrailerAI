import { ContentApiResponse } from "@/types/content";
import { privateApiService } from "../http";
import { endpoints } from "../endpoints";
import { useQuery } from "@tanstack/react-query";

export interface DeeplinkQueryParams {
  page?: number;
  perPage?: number;
  contentType?: string;
  lang?: string;
  dialect?: string;
  search?: string;
}

export const deeplinkApi = {
  getContentData: async (
    params?: DeeplinkQueryParams
  ): Promise<ContentApiResponse> => {
    try {
      const queryParams = new URLSearchParams();

      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.perPage)
        queryParams.append("perPage", params.perPage.toString());
      if (params?.contentType)
        queryParams.append("contentType", params.contentType);
      if (params?.lang) queryParams.append("lang", params.lang);
      if (params?.dialect) queryParams.append("dialect", params.dialect);
      if (params?.search) queryParams.append("search", params.search);

      const url = `${endpoints.deeplink.getContentData}${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;

      const response = await privateApiService.get<ContentApiResponse>(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return data;
    } catch (error) {
      console.error("Error fetching content data:", error);
      throw error;
    }
  },
};

export const useDeeplinkContentQuery = (params?: DeeplinkQueryParams) => {
  return useQuery({
    queryKey: ["deeplink", params],
    queryFn: async () => {
      const response = await deeplinkApi.getContentData(params);
      return response;
    },
  });
};
