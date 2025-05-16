// ============================================================================
// COMPONENT NAME: BackButton
// PURPOSE: Provides a consistent, accessible way for users to return to the main dashboard page from any subpage.
// CONTEXT: Used at the top of all pages except the dashboard, integrated via the main layout.
// DATA FLOW: Receives no props; on click, navigates to '/dashboard' using Next.js client-side routing.
// KEY DEPENDENCIES: React, next/navigation (useRouter), components/ui/button (Button)
//
// This component is designed for reusability and easy future styling. It uses a left-arrow SVG icon for user-friendly navigation.
// Accessibility is ensured via ARIA labels and keyboard focusability.
// ----------------------------------------------------------------------------

'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './ui/button'

/**
 * BackButton Component
 *
 * PURPOSE: Renders a button with a left-arrow icon that navigates the user back to the dashboard page ('/dashboard').
 * CONTEXT: Intended for use at the top of all pages except the dashboard itself.
 * INPUTS: None (self-contained navigation logic)
 * OUTPUTS: None (side effect: navigation)
 * ASSUMPTIONS: The dashboard route is always '/dashboard'.
 * EDGE CASES: None (button is hidden on dashboard page via layout logic).
 *
 * ACCESSIBILITY: Includes aria-label for screen readers. Button is keyboard focusable.
 *
 * USAGE EXAMPLE:
 *   <BackButton />
 */
export function BackButton() {
  const router = useRouter()

  // Handler for button click: navigates to dashboard
  const handleClick = () => {
    router.push('/dashboard')
  }

  return (
    <Button
      onClick={handleClick}
      variant="ghost"
      size="icon"
      aria-label="Back to dashboard"
      className="mt-4 ml-2 bg-transparent hover:bg-transparent/10 backdrop-blur-none"
    >
      {/* Left-arrow SVG icon (user-friendly, accessible) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
    </Button>
  )
} 