"use client";
import { usePathname } from "next/navigation";
import { UserInfo } from "../UserInfo";
import { Routes } from "@/utils/routes";

const findRouteByPath = (pathname: string) => {
  for (const key in Routes) {
    if (key in Routes) {
      const route = Routes[key as keyof typeof Routes];
      if (route?.path === pathname) {
        return route;
      }
    }
  }
  return null;
};

export const headerHeight = "h-20";

export const Header: React.FC = () => {
  const pathname = usePathname();
  const currHeading = findRouteByPath(pathname)?.name;

  return (
    <div
      className={`bg-card ${headerHeight} w-full flex items-center px-2 md:px-8 text-center border-b justify-start`}
    >
      <h1 className="text-2xl font-bold">{currHeading}</h1>
      <UserInfo />
    </div>
  );
};
