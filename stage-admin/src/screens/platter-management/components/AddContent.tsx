import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/icons";

interface AddContentProps {
  onClick?: () => void;
}

export const AddContent = ({ onClick }: AddContentProps) => {
  return (
    <Card
      variant="dark-add"
      className="min-h-96 cursor-pointer"
      onClick={onClick}
    >
      <CardContent variant="dark-centered">
        <Button variant="dark-icon" size="dark-icon" className="mb-4">
          <Icons.plusIcon className="w-6 h-6" />
        </Button>
        <span className="text-sm font-medium text-gray-300">Add Content</span>
      </CardContent>
    </Card>
  );
};
