import { endpoints } from "../endpoints";
import { stageBackendApiService } from "../http";
import { VariantResponse, VariantsResponse, RowsResponse } from "@/types/variant";

interface VariantPayload {
  name: string;
  status: string;
  rowSequence: string[];
  availableIn: string[];
  userSubscriptionStatus?: number;
  isDefault?: boolean;
}

export const variantApi = {
  getVariants: (params: { os: string; platform: string; lang: string; dialect: string }) =>
    stageBackendApiService.get<VariantsResponse>(
      endpoints.variant.getVariants + "?" + new URLSearchParams(params).toString()
    ),
    
  getVariantById: (variantId: string) =>
    stageBackendApiService.get<VariantResponse>(
      endpoints.variant.getVariantById + "?variantId=" + variantId
    ),

  getRows: () => 
    stageBackendApiService.get<RowsResponse>(endpoints.variant.getRows),

  updateVariant: ( payload: VariantPayload,variantId?: string,) =>
    stageBackendApiService.post<VariantResponse>(
      variantId ? `${endpoints.variant.updateVariant}?variantId=${variantId}` : endpoints.variant.updateVariant,
      { 
        json: {
          ...payload,
        }
      }
    ),
}; 