"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCensorBoardListContentsQuery } from "@/service/modules/censorBoard.api";
import { DialectEnum } from "@/types/common";
import { DIALECTS } from "@/utils/constants";
import { useQueryState } from "nuqs";
import CensorBoardItem from "./CensorBoardItem";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { useState } from "react";

export interface Dialog {
  open: boolean;
  type: "delete" | "publish";
  title: string;
  description: string;
  confirmLabel: string;
  confirmClassName: string;
  onConfirm: () => void;
}

export default function CensorBoard() {
  const [selectedDialect, setSelectedDialect] = useQueryState("dialect", {
    defaultValue: DIALECTS[0]?.value,
    parse: (value) => value as DialectEnum,
    serialize: (value) => value,
  });

  const { data, isLoading, error } = useCensorBoardListContentsQuery({
    dialect: selectedDialect as DialectEnum,
  });

  const [dialog, setDialog] = useState<Dialog>({
    open: false,
    type: "delete",
    title: "",
    description: "",
    confirmLabel: "",
    confirmClassName: "",
    onConfirm: () => {},
  });
  const items = data || [];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-end mb-6">
          <div className="flex items-center gap-4">
            <div className="w-48">
              <Select
                value={selectedDialect}
                onValueChange={(value) =>
                  setSelectedDialect(
                    value as (typeof DIALECTS)[number]["value"]
                  )
                }
              >
                <SelectTrigger variant="light" className="w-full">
                  <SelectValue placeholder="Select dialect" />
                </SelectTrigger>
                <SelectContent>
                  {DIALECTS.map((dialect) => (
                    <SelectItem key={dialect.value} value={dialect.value}>
                      {dialect.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500">Loading content...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-end mb-6">
          <div className="flex items-center gap-4">
            <div className="w-48">
              <Select
                value={selectedDialect}
                onValueChange={(value) =>
                  setSelectedDialect(
                    value as (typeof DIALECTS)[number]["value"]
                  )
                }
              >
                <SelectTrigger variant="light" className="w-full">
                  <SelectValue placeholder="Select dialect" />
                </SelectTrigger>
                <SelectContent>
                  {DIALECTS.map((dialect) => (
                    <SelectItem key={dialect.value} value={dialect.value}>
                      {dialect.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-500">Error loading content</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-end mb-6">
        <div className="flex items-center gap-4">
          <div className="w-48">
            <Select
              value={selectedDialect}
              onValueChange={(value) =>
                setSelectedDialect(value as (typeof DIALECTS)[number]["value"])
              }
            >
              <SelectTrigger variant="light" className="w-full">
                <SelectValue placeholder="Select dialect" />
              </SelectTrigger>
              <SelectContent>
                {DIALECTS.map((dialect) => (
                  <SelectItem key={dialect.value} value={dialect.value}>
                    {dialect.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item, idx) => (
          <CensorBoardItem
            key={item.slug || idx}
            item={item}
            idx={idx}
            dialect={selectedDialect}
            setDialog={setDialog}
          />
        ))}
      </div>
      {items.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500">No content found</div>
        </div>
      )}
      <ConfirmationDialog
        isOpen={dialog.open}
        onClose={() =>
          setDialog({
            open: false,
            type: "delete",
            title: "",
            description: "",
            confirmLabel: "",
            confirmClassName: "",
            onConfirm: () => {},
          })
        }
        onConfirm={dialog.onConfirm}
        title={dialog.title}
        description={dialog.description}
        confirmLabel={dialog.confirmLabel}
        confirmClassName={dialog.confirmClassName}
      />
    </div>
  );
}
