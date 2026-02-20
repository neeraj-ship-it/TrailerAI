import { Header } from "@/components/layout/Header";
import { SideMenubar } from "@/components/layout/SideMenubar";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* TODO: Implement verify token api  */}
      {/* <ProtectedRoute> */}
      {/* // Desktop layout */}
      <div className="h-full hidden md:flex">
        <SideMenubar />
        <div className="w-full flex flex-col">
          <Header />
          <div className="overflow-y-auto flex-1 ">{children}</div>
        </div>
      </div>
      {/* // Mobile Layout */}
      <div className="flex h-full flex-col md:hidden">
        <div className="w-full flex">
          <SideMenubar />
          <Header />
        </div>
        <div className="overflow-y-auto flex-1 ">{children}</div>
      </div>
      {/* </ProtectedRoute> */}
    </>
  );
}
