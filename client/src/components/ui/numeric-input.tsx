import { useState, useEffect } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface NumericInputProps {
  value: number | string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  allowDecimal?: boolean;
  defaultValue?: number;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export function NumericInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  allowDecimal = false,
  defaultValue = 0,
  className,
  placeholder,
  disabled,
  "data-testid": testId,
}: NumericInputProps) {
  const [inputValue, setInputValue] = useState(String(value));

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const pattern = allowDecimal ? /^-?\d*\.?\d*$/ : /^-?\d*$/;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || val === "-" || pattern.test(val)) {
      setInputValue(val);
    }
  };

  const handleBlur = () => {
    let numValue = allowDecimal ? parseFloat(inputValue) : parseInt(inputValue);
    
    if (isNaN(numValue)) {
      numValue = defaultValue;
    }
    
    if (min !== undefined) {
      numValue = Math.max(min, numValue);
    }
    if (max !== undefined) {
      numValue = Math.min(max, numValue);
    }
    
    const finalValue = allowDecimal ? numValue : Math.round(numValue);
    setInputValue(String(finalValue));
    onChange(finalValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <Input
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn(className)}
      placeholder={placeholder}
      disabled={disabled}
      data-testid={testId}
    />
  );
}
