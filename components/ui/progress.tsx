/**
 * COMPONENT: Progress
 * 
 * PURPOSE: A UI component representing a progress bar
 * 
 * CONTEXT: Used throughout the application to visualize progress and percentages
 * 
 * DATA FLOW: Receives a value (0-100) and displays it as a visual progress indicator
 * 
 * KEY DEPENDENCIES: 
 *   - React
 *   - Class variance authority for style variants
 *   - Tailwind CSS for styling
 */

"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress } 