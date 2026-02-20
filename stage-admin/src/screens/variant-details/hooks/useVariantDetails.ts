"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { variantApi } from "@/service/modules/variant.api";
import { RowData } from "@/types/variant";
import { Routes } from "@/utils/routes";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useToast } from "@/hooks/useToast";
import { HTTPError } from "ky";

interface FormState {
  name: string;
  status: string;
  rowSequence: string[];
  availableIn: string[];
  userSubscriptionStatus?: number;
  isDefault?: boolean;
}

export const useVariantDetails = () => {
  const router = useRouter();
  const params = useParams();
  const variantId = params?.id as string;
  const isCreateMode = params?.id === "create";
  const { toast } = useToast();
  
  const [formState, setFormState] = useState<FormState>({
    name: "",
    status: "active",
    rowSequence: [],
    availableIn: []
  });
  const [allRows, setAllRows] = useState<RowData[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; rows?: string }>({});
  const [bannerRows, setBannerRows] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRows = useMemo(() => 
    allRows.filter(row => 
      row.en.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [allRows, searchQuery]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Get all rows first to identify banners
        const rowsResponse = await variantApi.getRows();
        const rowsData = await rowsResponse.json();
        
        // Find banner rows
        const bannerRowKeys = rowsData.data
          .filter(row => row.widgetType === 'banner')
          .map(row => row.rowKey);
        
        setBannerRows(bannerRowKeys);
        setAllRows(rowsData.data.filter(row => row.widgetType !== 'banner'));

        if (variantId && !isCreateMode) {
          const response = await variantApi.getVariantById(variantId);
          const data = await response.json();
          setFormState({
            name: data.data.name,
            status: data.data.status,
            rowSequence: data.data.rowSequence,
            availableIn: data.data.availableIn,
            userSubscriptionStatus: data.data.userSubscriptionStatus,
            isDefault: data.data.isDefault
          });
          setSelectedRows(data.data.rowSequence.filter(rowKey => !bannerRowKeys.includes(rowKey)));
        } else {
          // For create mode, initialize with banner rows
          setSelectedRows([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [variantId, isCreateMode]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | { target: { name: string; value: string } }
  ) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  

  const handleToggleRow = (rowKey: string) => {
    // Don't allow toggling banner rows
    if (bannerRows.includes(rowKey)) return;
    
    setSelectedRows(prev => 
      prev.includes(rowKey) 
        ? prev.filter(key => key !== rowKey)
        : [...prev, rowKey]
    );
  };

  const handleToggleAvailableIn = (platform: string) => {
    setFormState(prev => ({
      ...prev,
      availableIn: prev.availableIn.includes(platform)
        ? prev.availableIn.filter(p => p !== platform)
        : [...prev.availableIn, platform]
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: { name?: string; rows?: string } = {};

    if (!formState.name.trim()) {
      newErrors.name = "Variant name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
  
    try {
      const payload = {
        ...formState,
        rowSequence: [...bannerRows, ...selectedRows],
      };
  
      if (variantId && !isCreateMode) {
        // Update existing variant
        await variantApi.updateVariant( payload,variantId);
      } else {
        // Create a new variant (variantId should not be passed)
        await variantApi.updateVariant(payload);
      }
  
      toast({
        variant: "default",
        title: "Success",
        description: isCreateMode ? "Variant created successfully" : "Variant updated successfully",
      });
  
      router.push(Routes.VARIANT.path);
    } catch (error) {
      if (error instanceof HTTPError && error.response.status === 404) {
        setErrors(prev => ({
          ...prev,
          name: "Variant name already exists. Please choose a different name."
        }));
        toast({
          variant: "destructive",
          title: "Error",
          description: "Variant name already exists. Please choose a different name.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save variant. Please try again.",
        });
        console.error("Error updating variant:", error);
      }
    }
  };
  const handleCloneVariant = async () => {
    if (!validateForm()) {
      return;
    }
  
    try {
      const payload = {
        ...formState,
        name: formState.name + "_v1",
        rowSequence: [...bannerRows, ...selectedRows],
        isDefault: false,
      };
        // Create a new variant (variantId should not be passed)
        await variantApi.updateVariant(payload);
  
      toast({
        variant: "default",
        title: "Success",
        description: isCreateMode ? "Variant created successfully" : "Variant updated successfully",
      });
  
      router.push(Routes.VARIANT.path);
    } catch (error) {
      if (error instanceof HTTPError && error.response.status === 404) {
        setErrors(prev => ({
          ...prev,
          name: "Variant name already exists. Please choose a different name."
        }));
        toast({
          variant: "destructive",
          title: "Error",
          description: "Variant name already exists. Please choose a different name.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save variant. Please try again.",
        });
        console.error("Error updating variant:", error);
      }
    }
  };
  
  const handleCancel = () => {
    router.push(Routes.VARIANT.path);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedRows((items) => {
        const oldIndex = items.indexOf(active.id.toString());
        const newIndex = items.indexOf(over.id.toString());
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return {
    formState,
    allRows,
    selectedRows,
    isLoading,
    errors,
    handleInputChange,
    handleToggleRow,
    handleToggleAvailableIn,
    handleSubmit,
    handleCloneVariant,
    handleCancel,
    handleDragEnd,
    searchQuery,
    filteredRows,
    handleSearchChange,
    variantId,
  };
}; 