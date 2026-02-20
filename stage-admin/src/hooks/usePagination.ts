"use client";

import { useCallback } from "react";
import { useQueryState } from "nuqs";

export interface PaginationResponse<T> {
  data: T[];
  nextPageAvailable?: boolean;
  page: number;
  perPage: number;
  totalPages?: number;
}

export interface PaginationInfo {
  nextPageAvailable: boolean;
  currentPage: number;
  perPage: number;
  totalPages: number;
}

export interface UsePaginationOptions {
  defaultPage?: number;
  defaultPerPage?: number;
  onPageChange?: () => void;
}

export const usePagination = (options: UsePaginationOptions = {}) => {
  const { defaultPage = 1, defaultPerPage = 20, onPageChange } = options;

  const [currentPage, setCurrentPage] = useQueryState("page", {
    defaultValue: defaultPage,
    parse: parseInt,
    serialize: (value) => value.toString(),
  });
  const [perPage, setPerPage] = useQueryState("perPage", {
    defaultValue: defaultPerPage,
    parse: parseInt,
    serialize: (value) => value.toString(),
  });

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      onPageChange?.();
    },
    [setCurrentPage, onPageChange]
  );

  const handlePerPageChange = useCallback(
    (newPerPage: number) => {
      setPerPage(newPerPage);
      setCurrentPage(1);
      onPageChange?.();
    },
    [setPerPage, setCurrentPage, onPageChange]
  );

  const resetPagination = useCallback(() => {
    setCurrentPage(defaultPage);
    setPerPage(defaultPerPage);
    onPageChange?.();
  }, [setCurrentPage, setPerPage, defaultPage, defaultPerPage, onPageChange]);

  const getPaginationInfo = useCallback(
    <T>(apiResponse: PaginationResponse<T> | undefined): PaginationInfo => {
      if (!apiResponse) {
        return {
          nextPageAvailable: false,
          currentPage: defaultPage,
          perPage: defaultPerPage,
          totalPages: 1,
        };
      }

      let totalPages = apiResponse.totalPages;
      if (!totalPages) {
        totalPages = apiResponse.nextPageAvailable
          ? (apiResponse.page || defaultPage) + 1
          : apiResponse.page || defaultPage;
      }

      return {
        nextPageAvailable: apiResponse.nextPageAvailable || false,
        currentPage: apiResponse.page || defaultPage,
        perPage: apiResponse.perPage || defaultPerPage,
        totalPages,
      };
    },
    [defaultPage, defaultPerPage]
  );

  return {
    currentPage,
    perPage,
    handlePageChange,
    handlePerPageChange,
    resetPagination,
    getPaginationInfo,
  };
};
