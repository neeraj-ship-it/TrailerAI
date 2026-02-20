"use client";

import { ComboBoxOption } from "@/components/ui/combobox";
import { DialectEnum } from "@/types/common";
import { usePlatterContentQuery } from "@/service/modules/platter.api";
import { useEffect, useState } from "react";

export const useGetContent = (dialect: DialectEnum) => {
  const {
    data: platterContent,
    isLoading,
    error,
  } = usePlatterContentQuery(dialect);

  const [content, setContent] = useState<ComboBoxOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (platterContent && Array.isArray(platterContent)) {
      setContent(
        platterContent.map((item) => ({
          value: item.slug,
          label: item.title,
        }))
      );
    } else {
      setContent([]);
    }
  }, [platterContent]);

  return {
    platterContent: platterContent || [],
    content,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
  };
};
