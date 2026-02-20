import { NextRequest, NextResponse } from "next/server";
import { Routes } from "./utils/routes";
import { CookieKeys } from "./utils/constants";
import { PrivilegeTypesEnum } from "./types/routes";

const PublicRoute = [Routes.LOGIN.path, Routes.FORBIDDEN.path];

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // AUTHENTICATION DISABLED FOR DEVELOPMENT - ALL ROUTES ARE PUBLIC
  // if (!PublicRoute.includes(pathname)) {
  //   const token = request.cookies.get(CookieKeys.token);
  //   const privileges: Array<string> = JSON.parse(
  //     request.cookies.get(CookieKeys.privileges)?.value || "[]"
  //   );

  //   if (!token || !privileges.length) {
  //     return NextResponse.redirect(new URL("/login", origin));
  //   }

  //   const currentRoute = checkIsRouteProtected(pathname);

  //   if (
  //     currentRoute?.isProtected &&
  //     !canAccessRoute(privileges, currentRoute.protectedPageName)
  //   ) {
  //     return NextResponse.redirect(new URL("/forbidden", origin));
  //   }
  //   // const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "user/verify", {
  //   //   headers: {
  //   //     Authorization: `Bearer ${token}`,
  //   //   },
  //   // });
  //   // console.log(
  //   //   "statue",
  //   //   res.status,
  //   //   process.env.NEXT_PUBLIC_API_URL + "user/verify"
  //   // );
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|^$|login|privacy).*)/",
  ],
};

const canAccessRoute = (privileges: Array<string>, pageName: string) => {
  return privileges.some((privilege) => {
    console.log({ privilege });
    return (
      privilege === PrivilegeTypesEnum.FULL_ACCESS ||
      privilege === `${pageName}_${PrivilegeTypesEnum.ALL}` ||
      privilege === `${pageName}_${PrivilegeTypesEnum.READ}`
    );
  });
};

const checkIsRouteProtected = (pathname: string) => {
  return Object.values(Routes).find(
    (route) => route.isProtected && pathname.startsWith(route.path)
  );
};
