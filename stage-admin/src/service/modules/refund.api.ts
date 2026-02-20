"use client";

import { useMutation } from "@tanstack/react-query";
import { privateApiService } from "../http";
import { InitiateResponse, RefundSearchRes } from "@/types/refund";
import { endpoints } from "../endpoints";

export const useTransactionDetails = () => {
  return useMutation({
    mutationFn: ({
      type,
      value,
    }: {
      type: "email" | "phoneNumber";
      value: string;
    }) => {
      let queryParam = "";
      if (type === "email") {
        queryParam = `email=${value}`;
      } else {
        queryParam = `mobileNumber=${value}`;
      }

      return privateApiService.get<RefundSearchRes>(
        endpoints.refund.getTransactionDetails + "?" + queryParam
      );
    },
  });
};

export const useInitiateRefund = () => {
  return useMutation({
    mutationFn: (payload: InitiateResponse) => {
      return privateApiService.post(endpoints.refund.initiateRefund, {
        json: payload,
      });
    },
  });
};
