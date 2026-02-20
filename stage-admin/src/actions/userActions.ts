"use server";

import { DecodedAccessToken } from "@/types/user";
import { CookieKeys } from "@/utils/constants";
import { Routes } from "@/utils/routes";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const signInAction = async (
  tokenPayload: DecodedAccessToken,
  token: string
) => {
  const privileges = tokenPayload?.privileges || [];

  if (tokenPayload.exp) {
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const timeRemainingInSeconds = tokenPayload?.exp - currentTimeInSeconds;
    cookies().set(CookieKeys.token, token, {
      maxAge: timeRemainingInSeconds,
    });
    cookies().set(CookieKeys.privileges, JSON.stringify(privileges), {
      maxAge: timeRemainingInSeconds,
    });
    redirect(Routes.DASHBOARD.path);
  }
};

export const signOutAction = async () => {
  Object.keys(CookieKeys).forEach((key) => {
    cookies().delete(key);
  });

  redirect(Routes.LOGIN.path);
};

export const getToken = async () => {
  return cookies().get(CookieKeys.token);
};
