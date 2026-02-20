"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { variantApi } from "@/service/modules/variant.api";
import { VariantData } from "@/types/variant";
import { Routes } from "@/utils/constants";

export const useVariant = () => {
  const [variantData, setVariantData] = useState<VariantData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchVariants = async () => {
      try {
        const response = await variantApi.getVariants({
          os: "android",
          platform: "app",
          lang: "en",
          dialect: "har",
        });
        const data = await response.json();
        setVariantData(data.data);
      } catch (error) {
        console.error("Error fetching variants:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVariants();
  }, []);

  const handleViewVariant = async (variantId?: string) => {
    try {
      if (variantId) {
         await variantApi.getVariantById(variantId);
        router.push(Routes.VariantDetail(variantId));
      } else {
        router.push(Routes.CreateVariant.path);
      }
    } catch (error) {
      console.error("Error fetching variant details:", error);
    }
  };
  

  return {
    variantData,
    isLoading,
    handleViewVariant,
  };
};