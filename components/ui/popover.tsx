"use client"

/**
 * POPOVER COMPONENT
 * 
 * A floating popover component built on Radix UI primitives.
 * Provides a trigger element that displays a floating content panel when activated.
 * 
 * USAGE:
 * <Popover>
 *   <PopoverTrigger>Open</PopoverTrigger>
 *   <PopoverContent>
 *     <p>This is the popover content.</p>
 *   </PopoverContent>
 * </Popover>
 */

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

/**
 * Root popover component that wraps the trigger and content
 */
const Popover = PopoverPrimitive.Root

/**
 * The trigger element that opens the popover
 */
const PopoverTrigger = PopoverPrimitive.Trigger

/**
 * The floating content panel of the popover
 */
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent } 