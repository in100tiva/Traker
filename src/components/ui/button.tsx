import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-medium select-none cursor-pointer transition-all active:scale-[0.97] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 tracking-[-0.01em]",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-[rgb(10,10,10)] font-semibold hover:bg-accent/90",
        secondary:
          "bg-surface-3 text-ink hover:bg-[rgb(48,48,48)]",
        ghost:
          "bg-transparent text-ink-dim border border-border hover:bg-surface-2 hover:text-ink",
        outline:
          "bg-transparent text-ink border border-border-strong hover:bg-surface-2",
        danger:
          "bg-transparent text-danger border border-danger/30 hover:bg-danger/10",
        accent:
          "bg-accent-soft text-accent border border-accent-ring hover:bg-accent-dim",
      },
      size: {
        sm: "h-8 px-3 text-xs gap-1.5",
        md: "h-11 px-[18px] text-sm gap-2",
        lg: "h-13 px-[22px] text-[15px] gap-2.5",
        icon: "h-11 w-11 p-0",
        iconSm: "h-8 w-8 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
