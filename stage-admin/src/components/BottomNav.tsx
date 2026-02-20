import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Icons } from "./icons";

interface BottomNavProps {
  onEdit: () => void;
  onPublish: () => void;
  isUpdatingPlatter: boolean;
}

export const BottomNav = ({
  onEdit,
  onPublish,
  isUpdatingPlatter,
}: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card-bg p-4 flex justify-end">
      <div className="flex space-x-4">
        <Button variant="red-icon" className="flex gap-2" onClick={onEdit}>
          {" "}
          <Icons.editIcon />
          Edit
        </Button>
        <Button
          variant="red-bg"
          onClick={onPublish}
          disabled={isUpdatingPlatter}
          className="flex gap-2 min-w-52"
        >
          {isUpdatingPlatter ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update & Publish Now"
          )}
        </Button>
      </div>
    </nav>
  );
};
