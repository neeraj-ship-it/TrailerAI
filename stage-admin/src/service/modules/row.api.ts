import { endpoints } from "../endpoints";
import { stageBackendApiService } from "../http";
import {  FormState } from "@/screens/rows/create/types";
import { RowResponse } from "@/types/variant";


export const rowApi = {
  createRow: (payload: FormState) => 
    stageBackendApiService.post(endpoints.row.create, {
      json: payload
    }),

  updateRow: (rowId: string, payload: FormState) =>
    stageBackendApiService.post(`${endpoints.row.update}?rowId=${rowId}`, {
      json: payload
    }),

  getRow: (key: string, lang: string, dialect: string, os: string, platform: string) =>
    stageBackendApiService.get<RowResponse>(
      `${endpoints.row.getRow}?key=${key}&lang=${lang}&dialect=${dialect}&os=${os}&platform=${platform}`
    ),
}; 