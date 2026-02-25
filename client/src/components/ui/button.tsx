import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-all duration-200 ease-out hover:scale-[1.01] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_6px_rgba(0,0,0,0.1)] hover:bg-primary/95",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:shadow-md hover:bg-destructive/95",
        outline:
          "border border-input bg-background/50 shadow-sm hover:bg-accent/80 hover:text-accent-foreground backdrop-blur-sm",
        secondary:
          "bg-secondary/80 text-secondary-foreground shadow-sm border border-secondary/20 hover:bg-secondary",
        ghost: "hover:bg-accent/80 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
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
    "btn-skeuo-base shadow-[0_0.25em_0_hsl(var(--primary-border)),0_0.3125em_0.625em_rgba(0,0,0,0.3)] active:shadow-[0_0.0625em_0_hsl(var(--primary-border)),0_0.125em_0.3125em_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.33,1,0.68,1)] active:scale-[0.98] active:translate-y-[0.0625em]",
  destructive:
    "btn-skeuo-base shadow-[0_0.25em_0_hsl(var(--destructive-border)),0_0.3125em_0.625em_rgba(0,0,0,0.3)] active:shadow-[0_0.0625em_0_hsl(var(--destructive-border)),0_0.125em_0.3125em_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.33,1,0.68,1)] active:scale-[0.98] active:translate-y-[0.0625em]",
  outline:
    "btn-skeuo-base shadow-[0_0.25em_0_hsl(var(--border)),0_0.3125em_0.625em_rgba(0,0,0,0.1)] active:shadow-[0_0.0625em_0_hsl(var(--border)),0_0.125em_0.3125em_rgba(0,0,0,0.1)] hover:bg-accent hover:text-accent-foreground transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.33,1,0.68,1)] active:scale-[0.98] active:translate-y-[0.0625em]",
  secondary:
    "btn-skeuo-base shadow-[0_0.25em_0_hsl(var(--secondary-border)),0_0.3125em_0.625em_rgba(0,0,0,0.1)] active:shadow-[0_0.0625em_0_hsl(var(--secondary-border)),0_0.125em_0.3125em_rgba(0,0,0,0.1)] border-secondary-border hover:bg-secondary/80 transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.33,1,0.68,1)] active:scale-[0.98] active:translate-y-[0.0625em]",
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
            <span className="btn-noise absolute inset-0 rounded-[inherit] pointer-events-none" aria-hidden="true" />
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
