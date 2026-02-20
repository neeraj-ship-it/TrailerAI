"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDeeplink } from "./hooks/useDeeplink";
import {
  DashboardHeader,
  DialectFilter,
  LanguageFilter,
  ContentTypeFilter,
  SearchFilter,
  ContentResults,
  ContentDisplay,
} from "./components";

interface FilterSectionProps {
  step: number;
  title: string;
  color: "blue" | "green" | "yellow";
  isVisible: boolean;
  children: React.ReactNode;
}

function FilterSection({
  step,
  title,
  isVisible,
  children,
}: FilterSectionProps) {
  if (!isVisible) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge
          className={`w-6 h-6 rounded-full  text-white font-bold text-sm flex items-center justify-center`}
        >
          {step}
        </Badge>
        <h3 className="text-sm font-medium text-gray-300">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function DeeplinkDashboard() {
  const {
    data,
    loading,
    error,
    selectedDialect,
    setSelectedDialect,
    selectedLanguage,
    setSelectedLanguage,
    selectedContentType,
    setSelectedContentType,
    titleFilter,
    handleTitleFilterChange,
    selectedItem,
    availableDialects,
    availableLanguages,
    availableContentTypes,
    handleItemSelect,
    resetFilters,
    copyToClipboard,

    currentPage,
    perPage,
    paginationInfo,
    handlePageChange,
    handlePerPageChange,
    hasWriteAccess,
  } = useDeeplink();

  const hasActiveFilters =
    selectedDialect || selectedLanguage || selectedContentType || titleFilter;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md border-red-500">
          <CardContent className="text-center p-6">
            <p className="text-red-400 font-medium text-lg">
              Error loading data
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <DashboardHeader />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Search Flow */}
          <div className="space-y-6">
            {/* Filter Row - Dialect, Language, Content Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FilterSection
                step={1}
                title="Dialect"
                color="blue"
                isVisible={true}
              >
                <DialectFilter
                  selectedDialect={selectedDialect}
                  onDialectChange={(value) => {
                    setSelectedDialect(value);
                    setSelectedLanguage("");
                    setSelectedContentType("");
                    handleItemSelect(null);
                  }}
                  availableDialects={availableDialects}
                />
              </FilterSection>

              <FilterSection
                step={2}
                title="Language (Optional)"
                color="green"
                isVisible={!!selectedDialect}
              >
                <LanguageFilter
                  selectedLanguage={selectedLanguage}
                  onLanguageChange={(value) => {
                    setSelectedLanguage(value);
                    setSelectedContentType("");
                    handleItemSelect(null);
                  }}
                  availableLanguages={availableLanguages}
                />
              </FilterSection>

              <FilterSection
                step={3}
                title="Content Type (Optional)"
                color="yellow"
                isVisible={!!selectedDialect}
              >
                <ContentTypeFilter
                  selectedContentType={selectedContentType}
                  onContentTypeChange={(value) => {
                    setSelectedContentType(value);
                    handleItemSelect(null);
                  }}
                  availableContentTypes={availableContentTypes}
                />
              </FilterSection>
            </div>

            {/* Title Filter */}
            {selectedDialect && (
              <SearchFilter
                searchTerm={titleFilter}
                onSearchChange={handleTitleFilterChange}
              />
            )}

            {/* Search Results */}
            <ContentResults
              data={data}
              loading={loading}
              onItemSelect={handleItemSelect}
              currentPage={currentPage}
              perPage={perPage}
              paginationInfo={paginationInfo}
              onPageChange={handlePageChange}
              onPerPageChange={handlePerPageChange}
            />
          </div>

          {/* Right Panel - Content Display */}
          <div>
            {hasActiveFilters && (
              <Button
                onClick={resetFilters}
                variant="outline"
                className="w-full mb-6"
              >
                Reset Filters
              </Button>
            )}
            <ContentDisplay
              selectedItem={selectedItem}
              hasWriteAccess={hasWriteAccess}
              onCopyToClipboard={copyToClipboard}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
