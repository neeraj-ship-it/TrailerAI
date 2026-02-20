"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { variantApi } from "@/service/modules/variant.api";
import { Routes } from "@/utils/routes";

export const useHomepage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleVariantButtonClick = async () => {
    try {
      setIsLoading(true);
       await variantApi.getVariants({
        os: "android",
        platform: "app",
        lang: "en",
        dialect: "har",
      });
      router.push(Routes.VARIANT.path);
    } catch (error) {
      console.error("Error fetching variants:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowButtonClick = async () => {
      router.push(Routes.ROW.path);
  };

  const handlePlatterButtonClick = async () => {
    router.push(Routes.PLATTER_MANAGEMENT.path);
  };

  return {
     handleVariantButtonClick,
     handleRowButtonClick,
     handlePlatterButtonClick,
    isLoading,
  };
}; 