"use client";

import { useState, useMemo } from "react";
import { TrailerProjectListItem } from "@/types/trailer";
import {
  useTrailerListQuery,
  TrailerQueryParams,
} from "@/service/modules/trailer.api";
import { useUser } from "@/context/UserContext";
import { PrivilegeTypesEnum, ProtectedRoutesEnum } from "@/types/routes";
import { usePagination } from "@/hooks/usePagination";

export const useTrailerAccess = () => {
  const { checkPrivilege } = useUser();

  // Allow access if user has FULL_ACCESS or specific TRAILER privileges
  const hasFullAccess = checkPrivilege(
    ProtectedRoutesEnum.TRAILER,
    PrivilegeTypesEnum.FULL_ACCESS
  );

  const hasTrailerReadAccess = checkPrivilege(
    ProtectedRoutesEnum.TRAILER,
    PrivilegeTypesEnum.READ
  );

  const hasTrailerWriteAccess = checkPrivilege(
    ProtectedRoutesEnum.TRAILER,
    PrivilegeTypesEnum.WRITE
  );

  return {
    hasReadAccess: hasFullAccess || hasTrailerReadAccess,
    hasWriteAccess: hasFullAccess || hasTrailerWriteAccess,
  };
};

export const useTrailer = () => {
  const { hasReadAccess, hasWriteAccess } = useTrailerAccess();

  const [selectedItem, setSelectedItem] = useState<TrailerProjectListItem | null>(null);
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

  const queryParams: TrailerQueryParams = useMemo(
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
  } = useTrailerListQuery(queryParams);

  const data = apiResponse?.data || [];
  const paginationInfo = getPaginationInfo<TrailerProjectListItem>(apiResponse);

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
