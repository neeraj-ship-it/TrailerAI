import { CookieKeys } from "@/utils/constants";
import { getClientSideCookies } from "@/utils/helpers";
import ky from "ky";
import { redirect } from "next/navigation";

// use private api service when calling private apis where response interceptor for 401 or 403 is required
export const privateApiService = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_BASE_API_URL,

  hooks: {
    beforeRequest: [
      async (request) => {
        const token = getClientSideCookies(CookieKeys.token);

        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        if (response.status === 401) {
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          } else {
            redirect("/login");
          }
        } else if (response.status === 403) {
          if (typeof window !== "undefined") {
            window.location.href = "/forbidden";
          } else {
            redirect("/login");
          }
        }
      },
    ],
  },
});

// use public api service when calling public apis
export const publicApiService = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_BASE_API_URL,

  hooks: {
    beforeRequest: [
      async (request) => {
        const token = getClientSideCookies(CookieKeys.token);

        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
  },
});


// currently I am using it from  local of my backend services
export const stageBackendApiService = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_EXPRESS_BASE_API_URL, 

  hooks: {
    beforeRequest: [
      async (request) => {
        const token = getClientSideCookies(CookieKeys.token);

        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        if (response.status === 401) {
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          } else {
            redirect("/login");
          }
        } else if (response.status === 403) {
          if (typeof window !== "undefined") {
            window.location.href = "/forbidden";
          } else {
            redirect("/login");
          }
        }
      },
    ],
  },
});


