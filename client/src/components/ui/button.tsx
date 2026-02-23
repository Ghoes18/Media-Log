import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary-border hover:shadow-[var(--elevate-1)] active:shadow-[var(--elevate-2)]",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive-border shadow-sm hover:shadow-[var(--elevate-1)] active:shadow-[var(--elevate-2)]",
        outline:
          "border border-input bg-background shadow-xs hover:shadow-[var(--elevate-1)] active:shadow-none [border-color:var(--button-outline)]",
        secondary:
          "border bg-secondary text-secondary-foreground border-secondary-border hover:shadow-[var(--elevate-1)] active:shadow-[var(--elevate-2)]",
        ghost: "border border-transparent hover:bg-accent hover:text-accent-foreground",
        link: "border border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        // @replit changed sizes
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Apply skeuomorphic 3D styling for primary/important CTAs */
  skeuo?: boolean
}

const skeuoStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "btn-skeuo-base shadow-[0_4px_0_hsl(var(--primary-border)),0_5px_10px_rgba(0,0,0,0.3)] active:shadow-[0_1px_0_hsl(var(--primary-border)),0_2px_5px_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.33,1,0.68,1)] active:scale-[0.98] active:translate-y-[1px]",
  destructive:
    "btn-skeuo-base shadow-[0_4px_0_hsl(var(--destructive-border)),0_5px_10px_rgba(0,0,0,0.3)] active:shadow-[0_1px_0_hsl(var(--destructive-border)),0_2px_5px_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.33,1,0.68,1)] active:scale-[0.98] active:translate-y-[1px]",
  outline:
    "btn-skeuo-base shadow-[0_4px_0_hsl(var(--border)),0_5px_10px_rgba(0,0,0,0.1)] active:shadow-[0_1px_0_hsl(var(--border)),0_2px_5px_rgba(0,0,0,0.1)] hover:bg-accent hover:text-accent-foreground transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.33,1,0.68,1)] active:scale-[0.98] active:translate-y-[1px]",
  secondary:
    "btn-skeuo-base shadow-[0_4px_0_hsl(var(--secondary-border)),0_5px_10px_rgba(0,0,0,0.1)] active:shadow-[0_1px_0_hsl(var(--secondary-border)),0_2px_5px_rgba(0,0,0,0.1)] border-secondary-border hover:bg-secondary/80 transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.33,1,0.68,1)] active:scale-[0.98] active:translate-y-[1px]",
  ghost:
    "btn-skeuo-base hover:bg-accent hover:text-accent-foreground transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.33,1,0.68,1)] active:scale-[0.98]",
  link:
    "btn-skeuo-base text-primary underline-offset-4 hover:underline transition-transform duration-150 ease-[cubic-bezier(0.33,1,0.68,1)] active:scale-[0.98]",
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, skeuo = false, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const resolvedVariant = variant ?? "default"
    const classes = cn(
      buttonVariants({ variant, size, className }),
      skeuo && skeuoStyles[resolvedVariant]
    )

    if (asChild) {
      return <Comp className={classes} ref={ref} {...props} />
    }

    return (
      <Comp className={classes} ref={ref} {...props}>
        {skeuo ? (
          <>
            <span className="btn-noise absolute inset-0 rounded-md pointer-events-none" aria-hidden="true" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              {props.children}
            </span>
          </>
        ) : (
          props.children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
