import { ComboBoxOption } from "@/components/ui/combobox";
import { PlatterContentItem } from "@/types/platter";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Content } from "../hooks/usePlatter";
import { PlatterItem } from "./PlatterItem";

interface SortablePlatterItemProps {
  item: Content;
  index: number;
  content: ComboBoxOption[];
  platterContent: PlatterContentItem[];
  updateContentItem: (content: Content, index: number) => void;
  editable?: boolean;
  isLoadingContent?: boolean;
  openDeleteDialog?: () => void;
}

export const SortablePlatterItem = ({
  item,
  index,
  content,
  platterContent,
  updateContentItem,
  editable = true,
  isLoadingContent,
  openDeleteDialog,
}: SortablePlatterItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: index, disabled: !editable });

  return (
    <div
      ref={setNodeRef}
      {...(editable ? { ...attributes, ...listeners } : {})}
      className={`relative transition-all duration-200 ${
        isDragging
          ? "opacity-50 z-10 ring-2 ring-blue-500 ring-opacity-50"
          : "opacity-100 z-0"
      } cursor-grab`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {
        <PlatterItem
          item={item}
          index={index}
          content={content}
          platterContent={platterContent}
          updateContentItem={updateContentItem}
          editable={editable}
          isLoadingContent={isLoadingContent}
          openDeleteDialog={openDeleteDialog}
        />
      }
    </div>
  );
};
