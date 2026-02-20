import { endpoints } from "../endpoints";
import { stageBackendApiService } from "../http";
import { ContentResponse } from "@/screens/rows/create/types";

export const contentApi = {
  getAllContents: (params: { dialect: string; lang: string }) => {
    const queryString = new URLSearchParams(params).toString();
    return stageBackendApiService.get<ContentResponse>(
      `${endpoints.content.getAllContents}?${queryString}`
    );
  }
}; 