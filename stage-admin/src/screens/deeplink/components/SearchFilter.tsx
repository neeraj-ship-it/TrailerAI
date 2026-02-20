import { Search } from "lucide-react";
import { FilterStep } from "./FilterStep";
import { Input } from "@/components/ui/input";
import useDebounce from "@/hooks/useDebounce";
import { useEffect, useState, useRef } from "react";

interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function SearchFilter({
  searchTerm,
  onSearchChange,
}: SearchFilterProps) {
  const [inputValue, setInputValue] = useState(searchTerm);
  const debouncedValue = useDebounce(inputValue, 500);
  const onSearchChangeRef = useRef(onSearchChange);

  // Keep the ref updated
  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  useEffect(() => {
    onSearchChangeRef.current(debouncedValue);
  }, [debouncedValue]);

  return (
    <FilterStep step={4} title="Filter by Title" icon={Search} color="purple">
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Search by title (works across English and Hindi)..."
      />
    </FilterStep>
  );
}
