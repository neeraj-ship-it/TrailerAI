"use client";

import { useState, useEffect } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { Icons } from "../icons";

interface CopyButtonProps {
  text: string;
  onCopy?: (text: string) => void;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showText?: boolean;
  disabled?: boolean;
}

export function CopyButton({
  text,
  onCopy,
  variant = "ghost",
  size = "sm",
  className,
  showText = true,
  disabled = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (copied) setCopied(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [copied]);

  const handleCopy = async () => {
    if (disabled) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      // Call the optional onCopy callback
      if (onCopy) {
        onCopy(text);
      }
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  return (
    <Button
      onClick={handleCopy}
      variant={variant}
      size={size}
      disabled={disabled}
      className={cn("transition-all duration-300 ease-in-out", className)}
    >
      <div className="flex items-center gap-1">
        <div className="relative h-4 w-4">
          <Icons.clippyIcon
            className={cn(
              "absolute top-0 left-0 transition-all duration-300 ease-in-out",
              copied ? "opacity-0 scale-75" : "opacity-100 scale-100"
            )}
            style={{
              strokeDasharray: 50,
              strokeDashoffset: copied ? -50 : 0,
            }}
          />
          <Icons.checkIcon
            className={cn(
              "absolute top-0 left-0 transition-all duration-300 ease-in-out",
              copied ? "opacity-100 scale-100" : "opacity-0 scale-75"
            )}
            style={{
              strokeDasharray: 50,
              strokeDashoffset: copied ? 0 : -50,
            }}
          />
        </div>
        {showText && (
          <span className="transition-all duration-300">
            {copied ? "Copied!" : "Copy"}
          </span>
        )}
      </div>
    </Button>
  );
}
