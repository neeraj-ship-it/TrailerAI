import { useState, useMemo } from "react";
import { useQueryState } from "nuqs";
import { ContentData } from "@/types/content";
import {
  useDeeplinkContentQuery,
  DeeplinkQueryParams,
} from "@/service/modules/contentDashboard.api";
import { useUser } from "@/context/UserContext";
import { PrivilegeTypesEnum, ProtectedRoutesEnum } from "@/types/routes";
import { DialectEnum } from "@/types/common";

export const useDeeplink = () => {
  const { checkPrivilege } = useUser();

  // Check permissions
  const hasReadAccess = checkPrivilege(
    ProtectedRoutesEnum.DEEPLINK,
    PrivilegeTypesEnum.READ
  );
  const hasWriteAccess = checkPrivilege(
    ProtectedRoutesEnum.DEEPLINK,
    PrivilegeTypesEnum.WRITE
  );

  // URL state management with nuqs
  const [selectedDialect, setSelectedDialect] = useQueryState("dialect", {
    defaultValue: "all", // Default to "all" to show all content
  });
  const [selectedLanguage, setSelectedLanguage] = useQueryState("language", {
    defaultValue: "",
  });
  const [selectedContentType, setSelectedContentType] = useQueryState(
    "contentType",
    {
      defaultValue: "",
    }
  );
  const [titleFilter, setTitleFilter] = useQueryState("search", {
    defaultValue: "",
  });
  const [currentPage, setCurrentPage] = useQueryState("page", {
    defaultValue: 1,
    parse: parseInt,
    serialize: (value) => value.toString(),
  });
  const [perPage, setPerPage] = useQueryState("perPage", {
    defaultValue: 20,
    parse: parseInt,
    serialize: (value) => value.toString(),
  });

  // Local state
  const [selectedItem, setSelectedItem] = useState<ContentData | null>(null);

  // Build query parameters
  const queryParams: DeeplinkQueryParams = useMemo(() => {
    const params: DeeplinkQueryParams = {
      page: currentPage,
      perPage: perPage,
    };

    if (selectedContentType) params.contentType = selectedContentType;
    if (selectedLanguage) params.lang = selectedLanguage;
    // Only add dialect filter if it's not "all" - when "all" is selected, show all dialects
    if (selectedDialect && selectedDialect !== "all") params.dialect = selectedDialect;
    if (titleFilter.trim()) params.search = titleFilter.trim();

    return params;
  }, [
    currentPage,
    perPage,
    selectedContentType,
    selectedLanguage,
    selectedDialect,
    titleFilter,
  ]);

  const {
    data: apiResponse,
    isLoading: loading,
    error,
  } = useDeeplinkContentQuery(queryParams);

  // Extract data from API response
  const data = apiResponse?.data || [];
  const paginationInfo = {
    nextPageAvailable: apiResponse?.nextPageAvailable || false,
    currentPage: apiResponse?.page || 1,
    perPage: apiResponse?.perPage || 20,
    totalPages: apiResponse?.totalPages || 1,
  };

  // Available options
  const availableDialects = useMemo(() => {
    // Add "All" option at the beginning to show all dialects
    return ["all", ...Object.values(DialectEnum)];
  }, []);

  const availableLanguages = useMemo(() => {
    // Allow language selection even when "All" is selected
    if (!selectedDialect || selectedDialect === "all") return ["hin", "en"];
    return ["hin", "en"];
  }, [selectedDialect]);

  const availableContentTypes = useMemo(() => {
    // Allow content type selection even when "All" dialect is selected
    if (!selectedDialect && !selectedLanguage) return [];
    return ["show", "movie", "microdrama"];
  }, [selectedDialect, selectedLanguage]);

  // No client-side filtering needed - API handles search

  // Functions
  const handleItemSelect = (item: ContentData | null) => {
    setSelectedItem(item);
  };

  const handleTitleFilterChange = (value: string) => {
    setTitleFilter(value);
    setSelectedItem(null);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedItem(null);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
    setSelectedItem(null);
  };

  const resetFilters = () => {
    setSelectedDialect("");
    setSelectedLanguage("");
    setSelectedContentType("");
    setTitleFilter("");
    setCurrentPage(1);
    setSelectedItem(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  return {
    // Data
    data: data,
    loading,
    error,
    selectedItem,
    titleFilter,

    // Filter states
    selectedDialect,
    setSelectedDialect,
    selectedLanguage,
    setSelectedLanguage,
    selectedContentType,
    setSelectedContentType,

    // Available options
    availableDialects,
    availableLanguages,
    availableContentTypes,

    // Pagination
    currentPage,
    perPage,
    paginationInfo,
    handlePageChange,
    handlePerPageChange,

    // Functions
    handleItemSelect,
    handleTitleFilterChange,
    resetFilters,
    copyToClipboard,

    // Permissions
    hasReadAccess,
    hasWriteAccess,
  };
};
