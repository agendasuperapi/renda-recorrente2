import { useState, useEffect } from "react";
import { format } from "date-fns";
import { isValid } from "date-fns/isValid";
import { parse } from "date-fns/parse";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerFilterProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DatePickerFilter({ value, onChange, placeholder = "dd/mm/aaaa", className }: DatePickerFilterProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Sync input value with the prop value
  useEffect(() => {
    if (value && isValid(value)) {
      setInputValue(format(value, "dd/MM/yyyy"));
    } else {
      setInputValue("");
    }
  }, [value]);

  const formatDateInput = (input: string) => {
    // Remove non-digits
    const digits = input.replace(/\D/g, "");
    
    // Format as dd/mm/yyyy
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateInput(e.target.value);
    setInputValue(formatted);

    // Try to parse the date when we have a complete date string
    if (formatted.length === 10) {
      const parsedDate = parse(formatted, "dd/MM/yyyy", new Date());
      if (isValid(parsedDate)) {
        onChange(parsedDate);
      }
    } else if (formatted.length === 0) {
      onChange(undefined);
    }
  };

  return (
    <div className={cn("relative flex items-center", className)}>
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        maxLength={10}
        className="pr-10"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={value && isValid(value) ? value : undefined}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
            initialFocus
            locale={ptBR}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
