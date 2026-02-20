"use client";

import { BottomNav } from "@/components/BottomNav";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DIALECTS } from "@/utils/constants";
import { PlatterTypeEnum } from "@/types/platter";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { Loader2 } from "lucide-react";
import { AddContent } from "./components/AddContent";
import { DroppableContainer } from "./components/DroppableContainer";
import { PlatterItem } from "./components/PlatterItem";
import { SortablePlatterItem } from "./components/SortablePlatterItem";
import { useGetContent } from "./hooks/useGetContent";
import { usePlatter } from "./hooks/usePlatter";
import { useSortablePlatter } from "./hooks/useSortablePlatter";
import { useState, useMemo } from "react";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { dialogConfig } from "@/utils/constants";

export const PlatterManagement = () => {
  const [dialogType, setDialogType] = useState<"publish" | "delete" | null>(
    null
  );
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const {
    selectedLocation,
    contentItems,
    handleLocationChange,
    updateContentItem,
    updateItems,
    updatePlatter,
    selectedTab,
    setSelectedTab,
    addContentItem,
    deleteContentItem,
    platterLoading,
    isUpdatingPlatter,
    editable,
    setEditable,
  } = usePlatter();

  const {
    content,
    platterContent,
    isLoading: isLoadingContent,
  } = useGetContent(selectedLocation);

  const { sensors, itemIds, activeItem, handleDragStart, handleDragEnd } =
    useSortablePlatter({
      items: contentItems,
      onItemsChange: updateItems,
    });

  const dialogProps = useMemo(() => {
    if (!dialogType) {
      return {
        isOpen: false,
        onConfirm: () => {},
        onClose: () => {
          setDialogType(null);
        },
        title: "",
        description: "",
        confirmLabel: "",
        confirmClassName: "",
      };
    }

    const baseConfig = dialogConfig[dialogType];

    return {
      isOpen: true,
      onConfirm: async () => {
        if (dialogType === "publish") {
          setDialogType(null);
          await updatePlatter();
          setEditable(false);
        } else if (dialogType === "delete") {
          if (deleteIndex !== null) {
            deleteContentItem(deleteIndex);
          }
          setDialogType(null);
          setDeleteIndex(null);
        }
      },
      onClose: () => {
        setDialogType(null);
        setDeleteIndex(null);
      },
      ...baseConfig,
    };
  }, [dialogType, deleteIndex]);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <section className="w-full mx-auto">
        {/* Header with tabs and location selector */}
        <header className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center mb-8">
          {/* Tabs */}
          <Tabs
            defaultValue={PlatterTypeEnum.D0}
            value={selectedTab}
            onValueChange={(value) => {
              setSelectedTab(value as PlatterTypeEnum);
            }}
            className="justify-self-start"
          >
            <TabsList variant="dark">
              <TabsTrigger value={PlatterTypeEnum.D0} variant="dark">
                Platter D0
              </TabsTrigger>
              <TabsTrigger value={PlatterTypeEnum.DN} variant="dark">
                Platter DN
              </TabsTrigger>
            </TabsList>
            <TabsContent value={PlatterTypeEnum.D0}>
              {/* Content area */}
            </TabsContent>
            <TabsContent value={PlatterTypeEnum.DN}>
              {/* Content area for D1 */}
            </TabsContent>
          </Tabs>

          {/* Location Selector */}
          <aside className="justify-self-end">
            <Select
              value={selectedLocation}
              onValueChange={handleLocationChange}
            >
              <SelectTrigger variant="light" className="w-full max-w-48">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {DIALECTS.map((dialect) => (
                  <SelectItem key={dialect.value} value={dialect.value}>
                    {dialect.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </aside>
        </header>

        <section className="space-y-6">
          {/* User management section hint */}
          {platterLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <DroppableContainer>
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-28">
                  <SortableContext
                    items={itemIds}
                    strategy={rectSortingStrategy}
                  >
                    {contentItems.map((item, index) => (
                      <SortablePlatterItem
                        key={index}
                        item={item}
                        index={index}
                        content={content.map((c) => ({
                          ...c,
                          disabled: contentItems.some(
                            (contentItem, contentIndex) =>
                              contentItem.slug === c.value &&
                              contentIndex !== index
                          ),
                        }))}
                        platterContent={platterContent || []}
                        updateContentItem={updateContentItem}
                        editable={editable}
                        isLoadingContent={isLoadingContent}
                        openDeleteDialog={() => {
                          setDeleteIndex(index);
                          setDialogType("delete");
                        }}
                      />
                    ))}
                  </SortableContext>

                  {/* Add Content Card */}
                  {editable && contentItems.length < 10 && (
                    <AddContent onClick={addContentItem} />
                  )}
                </section>
              </DroppableContainer>

              {/* Drag Overlay */}
              <DragOverlay>
                {activeItem ? (
                  <div className="opacity-100">
                    <PlatterItem
                      updateContentItem={updateContentItem}
                      item={activeItem}
                      index={contentItems.findIndex(
                        (item) => item.slug === activeItem.slug
                      )}
                      content={content}
                      platterContent={platterContent || []}
                      editable={editable}
                      isLoadingContent={isLoadingContent}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </section>

        <BottomNav
          onEdit={() => {
            setEditable(!editable);
          }}
          onPublish={() => setDialogType("publish")}
          isUpdatingPlatter={isUpdatingPlatter}
        />

        <ConfirmationDialog {...dialogProps} />
      </section>
    </main>
  );
};
