import type { Metadata } from "next";
import "./globals.css";
import { JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { AppWrapper } from "@/components/AppWraper";
import { cookies } from "next/headers";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Stage Admin",
  description: "Stage Admin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // FOR DEVELOPMENT: Default to FULL_ACCESS if no privileges cookie
  const priviliges = JSON.parse(
    cookies().get("privileges")?.value || '["FULL_ACCESS"]'
  ) as Array<string>;

  return (
    <html lang="en" className="dark">
      <body className={cn("antialiased", jetBrainsMono.className)}>
        <NuqsAdapter>
          <AppWrapper priviliges={priviliges}>{children}</AppWrapper>
        </NuqsAdapter>
      </body>
    </html>
  );
}
