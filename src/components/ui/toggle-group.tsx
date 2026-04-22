import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ToggleGroupContextValue {
  value: string | undefined
  onValueChange: (value: string) => void
  type: "single" | "multiple"
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | undefined>(undefined)

interface ToggleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string | undefined
  onValueChange: (value: string) => void
  type?: "single" | "multiple"
}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ className, value, onValueChange, type = "single", children, ...props }, ref) => {
    return (
      <ToggleGroupContext.Provider value={{ value, onValueChange, type }}>
        <div
          ref={ref}
          className={cn("flex items-center justify-center gap-1", className)}
          {...props}
        >
          {children}
        </div>
      </ToggleGroupContext.Provider>
    )
  }
)
ToggleGroup.displayName = "ToggleGroup"

interface ToggleGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, value, children, onClick, ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext)

    if (!context) {
      throw new Error("ToggleGroupItem must be used within a ToggleGroup")
    }

    const isSelected = context.value === value

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      context.onValueChange(value)
      onClick?.(e)
    }

    return (
      <Button
        ref={ref}
        variant={isSelected ? "secondary" : "ghost"}
        size="sm"
        onClick={handleClick}
        className={cn(
          "flex-1",
          isSelected && "bg-muted font-medium text-primary",
          className
        )}
        {...props}
      >
        {children}
      </Button>
    )
  }
)
ToggleGroupItem.displayName = "ToggleGroupItem"

export { ToggleGroup, ToggleGroupItem }
