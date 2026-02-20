import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentData } from "@/types/content";
import { RefreshCw } from "lucide-react";

interface ContentResultsProps {
  data: ContentData[];
  loading: boolean;
  onItemSelect: (item: ContentData) => void;

  currentPage: number;
  perPage: number;
  paginationInfo: {
    nextPageAvailable: boolean;
    currentPage: number;
    perPage: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

export function ContentResults({
  data,
  loading,
  onItemSelect,

  currentPage,
  perPage,
  paginationInfo,
  onPageChange,
  onPerPageChange,
}: ContentResultsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Content Results ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
                <p className="text-gray-300">Loading content data...</p>
              </div>
            </div>
          ) : (
            <>
              {data.map((item) => (
                <div
                  key={`${item.contentSlug}-${item.displayLanguage}`}
                  onClick={() => onItemSelect(item)}
                  className="group relative p-4 bg-gray-800/50 border border-gray-600/50 rounded-xl hover:bg-gray-700/70 cursor-pointer transition-all duration-300 hover:border-blue-400/60 hover:shadow-lg hover:shadow-blue-500/10"
                >
                  {/* Click indicator */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-6">
                      <p className="font-semibold text-white text-lg group-hover:text-blue-100 transition-colors duration-200 mb-3">
                        {item.title}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={
                            item.contentType === "show"
                              ? "bg-red-900/80 text-red-200 border-red-700/50 group-hover:bg-red-800/90 group-hover:border-red-600/70"
                              : item.contentType === "movie"
                              ? "bg-green-900/80 text-green-200 border-green-700/50 group-hover:bg-green-800/90 group-hover:border-green-600/70"
                              : "bg-blue-900/80 text-blue-200 border-blue-700/50 group-hover:bg-blue-800/90 group-hover:border-blue-600/70"
                          }
                        >
                          {item.contentType}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs text-gray-300 border-gray-500/50 group-hover:text-gray-200 group-hover:border-gray-400/70"
                        >
                          {item.contentDialect}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs text-gray-300 border-gray-500/50 group-hover:text-gray-200 group-hover:border-gray-400/70"
                        >
                          {item.displayLanguage.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Subtle bottom border on hover */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              ))}
              {data.length === 0 && !loading && (
                <p className="text-gray-400 text-center py-8">
                  No results found for the selected filters.
                </p>
              )}
            </>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && data.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Per page:</span>
                <Select
                  value={perPage.toString()}
                  onValueChange={(value) => onPerPageChange(parseInt(value))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-sm text-gray-400">
                Page {paginationInfo.currentPage} of {paginationInfo.totalPages}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={!paginationInfo.nextPageAvailable}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
