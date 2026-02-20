"use client";
import { Card, CardContent } from "@/components/ui/card";
import { useRows } from "./hooks/useRows";
import { ORDER_KEYS_VIEW, WIDGET_TYPES } from "./create/constants";
import { Loader } from "@/components/ui/loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { WidgetTypeEnum } from "@/types/variant";

export const DynamicRows = () => {
  const {
    rowsData,
    isLoading,
    selectedWidgetType,
    searchQuery,
    selectedOrderKey,
    handleWidgetTypeChange,
    handleSearchChange,
    handleViewRow,
    handleCreateRow,
    handleOrderKeyChange,
  } = useRows();
  useRouter();

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="flex flex-col gap-4 p-8">
      <div className="flex justify-between items-center sticky top-0 bg-black z-10 p-4 shadow-md">
        <p className="text-foregroundSecondary">Rows</p>
        <div className="flex gap-4 items-center">
          <div className="relative w-[300px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rows..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8"
            />
          </div>
          <div className="w-[200px]">
            <Select
              value={selectedOrderKey}
              onValueChange={handleOrderKeyChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by Order By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Order By All</SelectItem>
                {ORDER_KEYS_VIEW.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[200px]">
            <Select
              value={selectedWidgetType}
              onValueChange={handleWidgetTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by widget type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Widget Types</SelectItem>
                {WIDGET_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleCreateRow}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Row
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {rowsData?.map((row) => (
              <div
                key={row._id}
                className="flex items-center justify-between p-4 border rounded-md"
              >
                <div>
                  <p className="font-medium">{row.en}</p>
                  <p className="text-sm text-muted-foreground">
                    Row Key: {row.rowKey}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status: {row.status}
                  </p>
                  <p className="text-sm font-bold text-blue-600">
                    OrderBy: {row.orderKey}
                  </p>
                </div>
                {WIDGET_TYPES.includes(row.widgetType as WidgetTypeEnum) && (
                  <Button
                    variant="secondary"
                    onClick={() => handleViewRow(row.rowKey)}
                  >
                    View
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
