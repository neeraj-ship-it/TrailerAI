"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ComboBoxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

const comboBoxVariants = cva("justify-between", {
  variants: {
    variant: {
      default: "w-[200px]",
      sm: "w-[150px]",
      lg: "w-[300px]",
      full: "w-full",
    },
    size: {
      default: "h-9",
      sm: "h-8",
      lg: "h-10",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface ComboBoxProps extends VariantProps<typeof comboBoxVariants> {
  options: ComboBoxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  buttonVariant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive";
  popoverClassName?: string;
  allowClear?: boolean;
  onClear?: () => void;
  loading?: boolean;
  groupBy?: (option: ComboBoxOption) => string;
  onSearchChange?: (search: string) => void;
}

export function ComboBox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No option found.",
  disabled = false,
  className,
  variant,
  size,
  buttonVariant = "outline",
  popoverClassName,
  allowClear = false,
  onClear,
  loading = false,
  groupBy,
  onSearchChange,
}: ComboBoxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  // Use external search handling if onSearchChange is provided, otherwise filter internally
  const filteredOptions = React.useMemo(() => {
    if (onSearchChange) {
      return options;
    }

    if (!searchValue) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
        option.value.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [options, searchValue, onSearchChange]);

  const groupedOptions = React.useMemo(() => {
    if (!groupBy) return { "": filteredOptions };

    return filteredOptions.reduce((groups, option) => {
      const group = groupBy(option);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(option);
      return groups;
    }, {} as Record<string, ComboBoxOption[]>);
  }, [filteredOptions, groupBy]);

  const handleSelect = (selectedValue: string) => {
    const newValue = selectedValue === value ? "" : selectedValue;
    onValueChange?.(newValue);
    setOpen(false);
    setSearchValue("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.("");
    onClear?.();
  };

  const handleSearchChange = (newSearchValue: string) => {
    setSearchValue(newSearchValue);
    // Call external search handler if provided
    if (onSearchChange) {
      onSearchChange(newSearchValue);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={buttonVariant}
          role="combobox"
          aria-expanded={open}
          className={cn(comboBoxVariants({ variant, size }), className)}
          disabled={disabled || loading}
        >
          <span className="truncate">
            {loading ? "Loading..." : selectedOption?.label || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {allowClear && value && !loading && (
              <button
                onClick={handleClear}
                className="hover:bg-muted rounded-sm p-0.5 opacity-50 hover:opacity-100"
                type="button"
              >
                <Check className="h-3 w-3" />
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0", popoverClassName)}
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-9"
            value={searchValue}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
              <CommandGroup key={groupName} heading={groupName || undefined}>
                {groupOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                    disabled={option.disabled}
                    className={cn(
                      option.disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {option.label}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
