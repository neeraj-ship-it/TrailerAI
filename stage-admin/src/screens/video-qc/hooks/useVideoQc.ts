"use client";

import { useState, useMemo } from "react";
import { VideoQcItem } from "@/types/videoQc";
import {
  useVideoQcListQuery,
  VideoQcQueryParams,
} from "@/service/modules/videoQc.api";
import { useUser } from "@/context/UserContext";
import { PrivilegeTypesEnum, ProtectedRoutesEnum } from "@/types/routes";
import { usePagination } from "@/hooks/usePagination";

export const useVideoQcAccess = () => {
  const { checkPrivilege } = useUser();

  return {
    hasReadAccess: checkPrivilege(
      ProtectedRoutesEnum.VIDEO_QC,
      PrivilegeTypesEnum.READ
    ),
    hasWriteAccess: checkPrivilege(
      ProtectedRoutesEnum.VIDEO_QC,
      PrivilegeTypesEnum.WRITE
    ),
  };
};

export const useVideoQc = () => {
  const { hasReadAccess, hasWriteAccess } = useVideoQcAccess();

  const [selectedItem, setSelectedItem] = useState<VideoQcItem | null>(null);

  const {
    currentPage,
    perPage,
    handlePageChange: paginationHandlePageChange,
    handlePerPageChange: paginationHandlePerPageChange,
    getPaginationInfo,
  } = usePagination({
    onPageChange: () => setSelectedItem(null),
  });

  const queryParams: VideoQcQueryParams = useMemo(
    () => ({
      page: currentPage,
      perPage: perPage,
    }),
    [currentPage, perPage]
  );

  const {
    data: apiResponse,
    isLoading: loading,
    error,
  } = useVideoQcListQuery(queryParams);

  const data = apiResponse?.data || [];
  const paginationInfo = getPaginationInfo<VideoQcItem>(apiResponse);

  return {
    data,
    loading,
    error,
    selectedItem,
    currentPage,
    perPage,
    paginationInfo,
    handlePageChange: paginationHandlePageChange,
    handlePerPageChange: paginationHandlePerPageChange,
    handleItemSelect: setSelectedItem,
    hasReadAccess,
    hasWriteAccess,
  };
};
