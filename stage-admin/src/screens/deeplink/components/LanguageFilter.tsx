import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LanguageFilterProps {
  selectedLanguage: string;
  onLanguageChange: (value: string) => void;
  availableLanguages: string[];
}

export function LanguageFilter({
  selectedLanguage,
  onLanguageChange,
  availableLanguages,
}: LanguageFilterProps) {
  return (
    <Select value={selectedLanguage} onValueChange={onLanguageChange}>
      <SelectTrigger>
        <SelectValue placeholder="Choose a language..." />
      </SelectTrigger>
      <SelectContent>
        {availableLanguages.map((lang) => (
          <SelectItem key={lang} value={lang}>
            {lang.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
