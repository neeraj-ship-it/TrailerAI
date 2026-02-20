'use client';

import * as React from 'react';
import { ComboBox, ComboBoxProps } from '@/components/ui/combobox';
import useDebounce from '@/hooks/useDebounce';

// Custom debounce hook

export interface DebouncedComboboxProps extends Omit<ComboBoxProps, 'onValueChange'> {
  onValueChange?: (value: string) => void;
  debounceDelay?: number; 
  onSearchChange?: (search: string) => void;
}

export function DebouncedCombobox({
  onValueChange,
  debounceDelay = 300,
  value: controlledValue,
  onSearchChange,
  ...props
}: DebouncedComboboxProps) {
  const [internalValue, setInternalValue] = React.useState(controlledValue || '');
  const [internalSearchValue, setInternalSearchValue] = React.useState('');
  
  const debouncedValue = useDebounce(internalValue, debounceDelay);
  const debouncedSearchValue = useDebounce(internalSearchValue, debounceDelay);

  // Update internal value when controlled value changes
  React.useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);


  React.useEffect(() => {

    if (onValueChange && debouncedValue !== (controlledValue || '')) {
      onValueChange(debouncedValue);
    }
  }, [debouncedValue, onValueChange, controlledValue]);


  React.useEffect(() => {
    if (onSearchChange) {
      onSearchChange(debouncedSearchValue);
    }
  }, [debouncedSearchValue, onSearchChange]);

  const handleValueChange = React.useCallback((newValue: string) => {
    setInternalValue(newValue);
    // If no debounce delay, call onValueChange immediately
    if (debounceDelay === 0 && onValueChange) {
      onValueChange(newValue);
    }
  }, [debounceDelay, onValueChange]);

  const handleSearchChange = React.useCallback((searchValue: string) => {
    setInternalSearchValue(searchValue);
    // If no debounce delay, call onSearchChange immediately
    if (debounceDelay === 0 && onSearchChange) {
      onSearchChange(searchValue);
    }
  }, [debounceDelay, onSearchChange]);

  return (
    <ComboBox
      {...props}
      value={controlledValue !== undefined ? controlledValue : internalValue}
      onValueChange={handleValueChange}
      onSearchChange={handleSearchChange}
    />
  );
}

export default DebouncedCombobox;
