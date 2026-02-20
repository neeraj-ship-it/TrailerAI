"use client";
import { useState, useEffect, useMemo } from "react";
import { variantApi } from "@/service/modules/variant.api";
import { RowData, WidgetTypeEnum } from "@/types/variant";
import { useRouter } from "next/navigation";
import { WIDGET_TYPES } from "../create/constants";
import { rowRoutes } from "@/utils/constants";

export const useRows = () => {
  const router = useRouter();
  const [rowsData, setRowsData] = useState<RowData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWidgetType, setSelectedWidgetType] = useState<string>('all');
  const [selectedOrderKey, setSelectedOrderKey] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCreateWidgetType, setSelectedCreateWidgetType] = useState<typeof WIDGET_TYPES[number]>(WidgetTypeEnum.NORMALROW);

  const filteredRows = useMemo(() => {
    if (!rowsData) return [];
    
    return rowsData.filter(row => {
      const orderType = selectedOrderKey === 'all' || row.orderKey === selectedOrderKey;
      const matchesType = selectedWidgetType === 'all' || row.widgetType === selectedWidgetType;
      const matchesSearch = row.en.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch && orderType;
    });
  }, [rowsData, selectedWidgetType, searchQuery, selectedOrderKey]);

  const handleWidgetTypeChange = (value: string) => {
    setSelectedWidgetType(value);
  };

  const handleOrderKeyChange = (value: string) => {
    setSelectedOrderKey(value);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleViewRow = (rowId: string) => {
    // router.push(`/dynamicHomepage/rows/${rowId}`);
    router.push(rowRoutes.RowDetail(rowId))
  };

  const handleCreateDialogOpen = () => {
    setShowCreateDialog(true);
  };

  const handleCreateDialogClose = () => {
    setShowCreateDialog(false);
    setSelectedCreateWidgetType(WidgetTypeEnum.NORMALROW);
  };

  const handleWidgetTypeSelect = (type: typeof WIDGET_TYPES[number]) => {
    setSelectedCreateWidgetType(type);
  };

  const handleCreateRow = () => {
    // router.push('/dynamicHomepage/rows/create');
    router.push(rowRoutes.CreateRow.path)
  };

  useEffect(() => {
    const fetchRows = async () => {
      try {
        const response = await variantApi.getRows();
        const data = await response.json();
        setRowsData(data.data);
      } catch (error) {
        console.error("Error fetching rows:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRows();
  }, []);

  return {
    rowsData: filteredRows,
    isLoading,
    selectedWidgetType,
    searchQuery,
    showCreateDialog,
    selectedCreateWidgetType,
    selectedOrderKey,
    handleWidgetTypeChange,
    handleSearchChange,
    handleViewRow,
    handleCreateDialogOpen,
    handleCreateDialogClose,
    handleWidgetTypeSelect,
    handleCreateRow,
    handleOrderKeyChange,
  };
}; 