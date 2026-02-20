"use client";

import { useMutation } from "@tanstack/react-query";
import { publicApiService } from "../http";
import { endpoints } from "../endpoints";

export const useSignInWithPassword = () => {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => {
      return publicApiService.post<{
        accessToken: string;
      }>(endpoints.auth.login, {
        json: { email, password },
      });
    },
  });
};

export const useVerifyToken = () => {
  return useMutation({
    mutationFn: () => {
      return publicApiService.post(endpoints.auth.verifyToken);
    },
  });
};
