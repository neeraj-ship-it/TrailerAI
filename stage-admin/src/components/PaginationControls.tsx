"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginationInfo } from "@/hooks/usePagination";

export interface PaginationControlsProps {
  currentPage: number;
  perPage: number;
  paginationInfo: PaginationInfo;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  perPageOptions?: number[];
  showPerPageSelector?: boolean;
  showPageIndicator?: boolean;
  className?: string;
}
export function PaginationControls({
  currentPage,
  perPage,
  paginationInfo,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 20, 50, 100],
  showPerPageSelector = true,
  showPageIndicator = true,
  className = "",
}: PaginationControlsProps) {
  const handlePrevious = () => {
    onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    onPageChange(currentPage + 1);
  };

  const isPreviousDisabled = currentPage <= 1;
  const isNextDisabled = !paginationInfo.nextPageAvailable;

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-4">
        {showPerPageSelector && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Per page:</span>
            <Select
              value={perPage.toString()}
              onValueChange={(value) => onPerPageChange(parseInt(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {perPageOptions.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {showPageIndicator && (
          <span className="text-sm text-muted-foreground">
            Page {paginationInfo.currentPage} of {paginationInfo.totalPages}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={isPreviousDisabled}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={isNextDisabled}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
