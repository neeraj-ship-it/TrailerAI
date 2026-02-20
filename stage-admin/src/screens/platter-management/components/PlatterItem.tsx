import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { ComboBox, ComboBoxOption } from "@/components/ui/combobox";
import { PlatterContentItem, PlatterContentTypeEnum } from "@/types/platter";
import { PLACEHOLDER_IMAGE_URL } from "@/utils/constants";
import Image from "next/image";
import { useCallback } from "react";
import { HiOutlineTrash } from "react-icons/hi2";
import { RxDragHandleDots2 } from "react-icons/rx";

import { Button } from "@/components/ui/button";
import { Content } from "../hooks/usePlatter";

interface PlatterItemProps {
  item: Content; // You can define a more specific type based on your data structure
  index: number;
  content: ComboBoxOption[];
  platterContent: PlatterContentItem[];
  updateContentItem: (content: Content, index: number) => void;
  editable?: boolean;
  isLoadingContent?: boolean;
  openDeleteDialog?: () => void;
}

export const PlatterItem = ({
  item,
  index,
  content,
  platterContent,
  updateContentItem,
  editable = false,
  isLoadingContent,
  openDeleteDialog,
}: PlatterItemProps) => {
  // Use the searchable options hook

  const getImageUrl = useCallback(
    (item: PlatterContentItem) => {
      const currentItem = platterContent.find(
        (content) => content.slug === item.slug
      );
      if (!currentItem) return PLACEHOLDER_IMAGE_URL;

      const { thumbnail, type } = currentItem;

      const fileName = thumbnail.square;
      if (!fileName || !type) return PLACEHOLDER_IMAGE_URL;
      return `https://stagemediavideo.s3.ap-south-1.amazonaws.com/${
        type === PlatterContentTypeEnum.SHOW ? "show" : "episode"
      }/square/large/${fileName}`;
    },
    [platterContent]
  );

  const handleValueChange = useCallback(
    (value: string) => {
      const platterItem = platterContent.find(
        (content) => content.slug === value
      );

      if (!platterItem) return;
      updateContentItem(
        {
          slug: platterItem.slug,
          type: platterItem.type,
          image: getImageUrl(platterItem),
        },
        index
      );
    },
    [platterContent, updateContentItem, index, getImageUrl]
  );

  return (
    <Card
      variant="content-item"
      className={`relative ${editable ? "cursor-grab" : "cursor-not-allowed"}`}
    >
      {editable && (
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <Button
            size="icon"
            variant="red-icon"
            className="rounded h-9 w-8 text-xl"
          >
            <RxDragHandleDots2 />
          </Button>
          <Button
            size="icon"
            variant="red-icon"
            className="rounded h-9 w-8 text-xl"
            onClick={openDeleteDialog}
          >
            <HiOutlineTrash />
          </Button>
        </div>
      )}
      <CardHeader variant="content-item">
        <Image
          src={item.image}
          width={400}
          height={300}
          alt="Content thumbnail"
          className="w-full aspect-square object-fill"
          draggable={false}
          unoptimized
        />
      </CardHeader>
      <CardContent variant="content-icon" className="w-full justify-start">
        <Button className="text-gray-400 text-sm" variant={"outline"}>
          {item.slug && item.type
            ? item.type === PlatterContentTypeEnum.SHOW
              ? "Show"
              : "Movie"
            : "Type"}
        </Button>
      </CardContent>
      <CardFooter className="" variant="content-item">
        <ComboBox
          options={content || []}
          value={item.slug}
          onValueChange={handleValueChange}
          placeholder="Select content..."
          searchPlaceholder="Search content..."
          className="w-full"
          disabled={!editable}
          loading={isLoadingContent}
          //   emptyMessage={error?.message || "No options found. Try a different search."}
        />
      </CardFooter>
    </Card>
  );
};
