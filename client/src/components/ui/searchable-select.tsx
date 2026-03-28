import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchableSelectOption {
  value: string;
  label: string;
  keywords?: string[];
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  dataTestId?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder = "Search...",
  emptyLabel = "No option found.",
  disabled,
  className,
  dataTestId,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);

  const normalizedOptions = useMemo<SearchableSelectOption[]>(() => {
    const result: SearchableSelectOption[] = [];
    const seenValues = new Set<string>();

    for (const option of options) {
      const normalizedValue = String(option.value ?? "").trim();
      if (!normalizedValue) {
        continue;
      }
      if (seenValues.has(normalizedValue)) {
        continue;
      }

      const normalizedLabel = String(option.label ?? "").trim() || normalizedValue;
      const normalizedKeywords = (option.keywords ?? [normalizedLabel])
        .map((keyword) => String(keyword ?? "").trim())
        .filter(Boolean);

      result.push({
        ...option,
        value: normalizedValue,
        label: normalizedLabel,
        keywords: normalizedKeywords.length ? normalizedKeywords : [normalizedLabel],
      });
      seenValues.add(normalizedValue);
    }

    return result;
  }, [options]);

  const selected = useMemo(
    () => normalizedOptions.find((option) => option.value === value),
    [normalizedOptions, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("justify-between font-normal", className)}
          data-testid={dataTestId}
        >
          <span className="truncate text-left">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {normalizedOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={option.keywords || [option.label]}
                  onSelect={() => {
                    try {
                      onValueChange(option.value);
                    } catch (error) {
                      console.error("SearchableSelect onValueChange failed", error);
                    }
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      option.value === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
