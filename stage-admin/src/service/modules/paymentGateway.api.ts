"use client";
import { useMutation } from "@tanstack/react-query";
import { privateApiService } from "../http";
import { endpoints } from "../endpoints";
import {
  GETPgConfigResponse,
  PatchPGConfigRequest,
  PaymentGatewayItem,
} from "@/types/paymentGateway";

export const useDetails = () => {
  return useMutation({
    mutationFn: () => {
      return privateApiService.get<GETPgConfigResponse>(endpoints.pg.config);
    },
  });
};

export const useUpdateDetails = () => {
  return useMutation({
    mutationFn: (payload: PatchPGConfigRequest) => {
      return privateApiService.patch<PaymentGatewayItem[]>(
        endpoints.pg.config,
        {
          json: payload,
        }
      );
    },
  });
};
