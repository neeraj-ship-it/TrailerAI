"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useVariantDetails } from "./hooks/useVariantDetails";
import { Loader } from "@/components/ui/loader";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableRow } from './components/SortableRow';
import { Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { platformOptions } from "@/utils/constants";
import React from 'react';

export const VariantDetails = () => {
  const {
    formState,
    allRows,
    selectedRows,
    isLoading,
    handleInputChange,
    handleToggleRow,
    handleToggleAvailableIn,
    handleSubmit,
    handleCloneVariant,
    handleCancel,
    handleDragEnd,
    errors,
    searchQuery,
    filteredRows,
    handleSearchChange,
    variantId
  } = useVariantDetails();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getRowName = (rowKey: string) => {
    const row = allRows.find(row => row.rowKey === rowKey);
  
    if (!row) {
      return `Unknown (${rowKey})`; 
    }
  
    return row.en || rowKey;
  };
  const viewCloneButton = variantId === "create" ? false : true;

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="flex flex-col gap-4 p-8">
      <p className="text-foregroundSecondary">Variant Details</p>
      {viewCloneButton ? (
        <div className="flex justify-end gap-2">
          <Button onClick={handleCloneVariant}>Clone This Variant LaZy</Button>
        </div>
      ) : null}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-4">
              <div>
              <Label className="text-sm font-medium" htmlFor="name">Name</Label>
                <Input
                  name="name"
                  value={formState.name}
                  onChange={handleInputChange}
                  placeholder="Enter variant name"
                />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1">{errors.name}</p>
                )}
              </div>

              <div>
              <Label className="text-sm font-medium" htmlFor="status">Status</Label>
                <Select name="status" value={formState.status} onValueChange={(value) => handleInputChange({ target: { name: 'status', value }})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Available In</label>
                <div className="flex gap-4">
                  {platformOptions.map((platform) => (
                    <div key={platform} className="flex items-center space-x-2">
                      <Checkbox
                        id={platform}
                        checked={formState.availableIn.includes(platform)}
                        onCheckedChange={() => handleToggleAvailableIn(platform)}
                      />
                      <Label className="text-sm font-medium" htmlFor={platform}>
                        {platform.toUpperCase()}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Select Rows</h3>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search rows..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="pl-8"
                    />
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto border border-border rounded-md p-4">
                    {filteredRows.map((row) => (
                      <div key={row._id} className="flex items-center space-x-2">
                        <Checkbox
                          id={row.rowKey}
                          checked={selectedRows.includes(row.rowKey)}
                          onCheckedChange={() => handleToggleRow(row.rowKey)}
                        />
                        <Label htmlFor={row.rowKey} className="text-sm">
                          {row.en}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                {errors.rows && (
                  <p className="text-sm text-destructive mt-2">{errors.rows}</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  Save Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 h-full">
            <div className="h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-4">Selected Rows</h3>
              <div className="border border-border rounded-md p-4 flex-1">
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={selectedRows}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin scrollbar-thumb-secondary-foreground/10 scrollbar-track-secondary hover:scrollbar-thumb-secondary-foreground/20">
                      {selectedRows.map((rowKey) => (                      
                        <SortableRow 
                          key={rowKey} 
                          id={rowKey} 
                          name={getRowName(rowKey)}
                        />                     
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
              <p className="text-sm text-muted-foreground mt-4 italic">
                Above make a homepage by adjusting various row titles
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 