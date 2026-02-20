import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DialectFilterProps {
  selectedDialect: string;
  onDialectChange: (value: string) => void;
  availableDialects: string[];
}

// Map dialect codes to display names
const dialectLabels: Record<string, string> = {
  all: "All",
  har: "Haryanvi",
  raj: "Rajasthani",
  bho: "Bhojpuri",
  guj: "Gujarati",
};

export function DialectFilter({
  selectedDialect,
  onDialectChange,
  availableDialects,
}: DialectFilterProps) {
  return (
    <Select value={selectedDialect} onValueChange={onDialectChange}>
      <SelectTrigger>
        <SelectValue placeholder="Choose a dialect..." />
      </SelectTrigger>
      <SelectContent>
        {availableDialects.map((dialect) => (
          <SelectItem key={dialect} value={dialect}>
            {dialectLabels[dialect] || dialect}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
