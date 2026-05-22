import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { NumberField } from "@base-ui/react/number-field"
import { Plus, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

function Input({ className, type, disabled, ...props }: React.ComponentProps<"input">) {
  if (type === "number") {
    const {
      value,
      onChange,
      min,
      max,
      step,
      defaultValue,
      ...restProps
    } = props;

    // Convert string value/defaultValue from parent to number | null
    const numValue = value !== undefined && value !== "" ? Number(value) : null;
    const numDefaultValue = defaultValue !== undefined && defaultValue !== "" ? Number(defaultValue) : undefined;

    // Parse limits
    const numMin = min !== undefined ? Number(min) : undefined;
    const numMax = max !== undefined ? Number(max) : undefined;
    const numStep = step !== undefined ? Number(step) : undefined;

    const handleValueChange = (val: number | null) => {
      if (onChange) {
        const event = {
          target: {
            name: props.name,
            value: val === null ? "" : String(val),
          },
          currentTarget: {
            name: props.name,
            value: val === null ? "" : String(val),
          },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
    };

    return (
      <NumberField.Root
        value={numValue}
        onValueChange={handleValueChange}
        min={numMin}
        max={numMax}
        step={numStep}
        defaultValue={numDefaultValue}
        disabled={disabled}
        className="relative flex items-center rounded-lg border border-input bg-transparent overflow-hidden h-8 w-full min-w-0 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
      >
        <NumberField.Decrement
          className="flex h-full w-8 items-center justify-center border-r border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 transition-colors cursor-pointer select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <Minus className="size-3" />
        </NumberField.Decrement>
        <NumberField.Input
          data-slot="input"
          className={cn(
            "h-full w-full min-w-0 bg-transparent px-2.5 py-1 text-center text-base outline-none md:text-sm placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30",
            className
          )}
          {...restProps}
        />
        <NumberField.Increment
          className="flex h-full w-8 items-center justify-center border-l border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 transition-colors cursor-pointer select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <Plus className="size-3" />
        </NumberField.Increment>
      </NumberField.Root>
    )
  }

  return (
    <InputPrimitive
      type={type}
      disabled={disabled}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
