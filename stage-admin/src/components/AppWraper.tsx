"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { UserContextProvider } from "@/context/UserContext";

const queryClient = new QueryClient();

export const AppWrapper = ({
  children,
  priviliges,
}: {
  children: React.ReactNode;
  priviliges: Array<string>;
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <UserContextProvider privileges={priviliges || []}>
        {children}
        <Toaster />
        <SonnerToaster position="top-right" richColors />
      </UserContextProvider>
    </QueryClientProvider>
  );
};
