import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "overflow-hidden rounded-xl border bg-card text-card-foreground shadow",
  {
    variants: {
      variant: {
        default: "",
        "dark-content": "border-gray-600 bg-gray-900/50 hover:bg-gray-800/50 transition-colors cursor-pointer aspect-square",
        "dark-add": "border-2 border-dashed border-gray-600 bg-gray-900/20 hover:border-gray-500 transition-colors cursor-pointer ",
        "content-item": "bg-card-bg border-card-bg p-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardVariants({ variant }), className)}
    {...props}
  />
));
Card.displayName = "Card";

const cardContentVariants = cva(
  "p-6",
  {
    variants: {
      variant: {
        default: "flex flex-col space-y-1.5",
        "dark-centered": "flex flex-col items-center justify-center h-full",
        "content-icon": "p-1 flex items-center justify-center",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const cardHeaderVariants = cva(
  "flex flex-col space-y-1.5 p-6",
  {
    variants: {
      variant: {
        default: "",
        "centered": "items-center text-center",
        "content-item": "p-1",
      },
    },
    defaultVariants: {
      
      variant: "default",
    },
  }
);

const cardTitleVariants = cva(
  "font-semibold leading-none tracking-tight",
  {
    variants: {
      variant: {
        default: "",
        "content-item": "p-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },

  }
);

const cardDescriptionVariants = cva(
  "text-sm text-muted-foreground",
  {
    variants: {
      variant: {
        default: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const cardFooterVariants = cva(
  "flex items-center ",
  {
    variants: {
      variant: {
        default: "p-6 ",
        "content-item": "p-1 flex-col items-start",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardHeaderVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardHeaderVariants({ variant }), className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & VariantProps<typeof cardTitleVariants>
>(({ className, variant, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(cardTitleVariants({ variant }), className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & VariantProps<typeof cardDescriptionVariants>
>(({ className, variant, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(cardDescriptionVariants({ variant }), className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardContentVariants>
>(({ className, variant, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(cardContentVariants({ variant }), className)} 
    {...props} 
  />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardFooterVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardFooterVariants({ variant }), className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
