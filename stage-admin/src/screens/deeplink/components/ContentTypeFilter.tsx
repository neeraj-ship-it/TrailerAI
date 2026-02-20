import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContentTypeFilterProps {
  selectedContentType: string;
  onContentTypeChange: (value: string) => void;
  availableContentTypes: string[];
}

export function ContentTypeFilter({
  selectedContentType,
  onContentTypeChange,
  availableContentTypes,
}: ContentTypeFilterProps) {
  return (
    <Select value={selectedContentType} onValueChange={onContentTypeChange}>
      <SelectTrigger>
        <SelectValue placeholder="Choose a content type..." />
      </SelectTrigger>
      <SelectContent>
        {availableContentTypes.map((type) => (
          <SelectItem key={type} value={type}>
            {type}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
