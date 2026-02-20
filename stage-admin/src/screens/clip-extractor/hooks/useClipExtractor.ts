"use client";

import { useState, useMemo } from "react";
import { ClipExtractorProjectListItem } from "@/types/clip-extractor";
import {
  useClipExtractorList,
  ClipExtractorQueryParams,
} from "@/service/modules/clip-extractor.api";
import { useUser } from "@/context/UserContext";
import { PrivilegeTypesEnum, ProtectedRoutesEnum } from "@/types/routes";
import { usePagination } from "@/hooks/usePagination";

export const useClipExtractorAccess = () => {
  const { checkPrivilege } = useUser();

  const hasFullAccess = checkPrivilege(
    ProtectedRoutesEnum.CLIP_EXTRACTOR,
    PrivilegeTypesEnum.FULL_ACCESS
  );

  const hasReadAccess = checkPrivilege(
    ProtectedRoutesEnum.CLIP_EXTRACTOR,
    PrivilegeTypesEnum.READ
  );

  const hasWriteAccess = checkPrivilege(
    ProtectedRoutesEnum.CLIP_EXTRACTOR,
    PrivilegeTypesEnum.WRITE
  );

  return {
    hasReadAccess: hasFullAccess || hasReadAccess,
    hasWriteAccess: hasFullAccess || hasWriteAccess,
  };
};

export const useClipExtractor = () => {
  const { hasReadAccess, hasWriteAccess } = useClipExtractorAccess();

  const [selectedItem, setSelectedItem] =
    useState<ClipExtractorProjectListItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const {
    currentPage,
    perPage,
    handlePageChange: paginationHandlePageChange,
    handlePerPageChange: paginationHandlePerPageChange,
    getPaginationInfo,
  } = usePagination({
    onPageChange: () => setSelectedItem(null),
  });

  const queryParams: ClipExtractorQueryParams = useMemo(
    () => ({
      page: currentPage,
      perPage: perPage,
      search: searchQuery || undefined,
      sortOrder: "desc",
    }),
    [currentPage, perPage, searchQuery]
  );

  const {
    data: apiResponse,
    isLoading: loading,
    error,
  } = useClipExtractorList(queryParams);

  const data = apiResponse?.data || [];
  const paginationInfo =
    getPaginationInfo<ClipExtractorProjectListItem>(apiResponse);

  return {
    data,
    loading,
    error,
    selectedItem,
    currentPage,
    perPage,
    paginationInfo,
    searchQuery,
    handlePageChange: paginationHandlePageChange,
    handlePerPageChange: paginationHandlePerPageChange,
    handleItemSelect: setSelectedItem,
    handleSearchChange: setSearchQuery,
    hasReadAccess,
    hasWriteAccess,
  };
};
