"use client";
import { useState } from "react";

import Link from "next/link";
import Image from "next/image";
import StageLogoWithoutText from "../../../public/images/stage-logo-without-text.png";
import StageLogoTextVertical from "../../../public/images/stage-logo-with-text-veritcal.png";
import { usePathname } from "next/navigation";
import { sidebarNavigationRoutes } from "@/utils/routes";
import { IoMenu } from "react-icons/io5";
import { headerHeight } from "./Header";
import { useUser } from "@/context/UserContext";
import { PrivilegeTypesEnum } from "@/types/routes";

export const SideMenubar = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { checkPrivilege } = useUser();
  const currPathName = usePathname();

  const handleToggle = () => {
    setIsCollapsed((prev) => !prev);
  };

  const filteredRoutes = sidebarNavigationRoutes.filter(
    (route) =>
      !route.isProtected ||
      (route.protectedPageName &&
        checkPrivilege(route.protectedPageName, PrivilegeTypesEnum.READ))
  );

  return (
    <div className="h-full">
      <div
        onClick={handleToggle}
        className={`bg-card block md:hidden z-51 ${headerHeight} border-b bg-black flex items-center justify-center p-2`}
      >
        <IoMenu size={32} />
      </div>
      <div
        className={`bg-card border-r transition-width duration-300 absolute top-0 md:sticky h-screen overflow-hidden ${
          isCollapsed
            ? "w-0 md:w-20 pointer-events-none md:pointer-events-auto"
            : "w-full md:w-64 z-50"
        }`}
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
      >
        <Link
          href="/"
          className={`${headerHeight} flex gap-2 border-b w-full px-2 items-center justify-center`}
        >
          <div className="w-14 items-center flex justify-center flex-shrink-0">
            {isCollapsed ? (
              <Image
                src={StageLogoTextVertical}
                alt="Logo"
                height={70}
                sizes="10rem"
                width={70}
              />
            ) : (
              <Image
                src={StageLogoWithoutText}
                alt="Logo"
                height={70}
                sizes="10rem"
                width={70}
              />
            )}
          </div>
          {!isCollapsed && (
            <p className="ml-2 text-xl font-bold truncate">TrailerAI</p>
          )}
        </Link>
        <div
          className={`mt-2  list-none  flex flex-col gap-8 ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          {filteredRoutes.map(({ path, name, icon: Icon }, index) => {
            const isActive = currPathName === path;
            return (
              <Link
                href={path}
                key={index}
                className={[
                  "flex items-center gap-6 py-4 pl-6 hover:bg-background",
                  isActive && "bg-background",
                  isCollapsed && "justify-center",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={handleToggle}
              >
                {Icon && <Icon size={32} className="flex-shrink-0" />}
                <p className="text-lg truncate">{name}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
