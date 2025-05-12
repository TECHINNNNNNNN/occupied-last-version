// ============================================================================
// COMPONENT NAME: BackButtonWrapper
// PURPOSE: Conditionally renders the BackButton on all pages except /dashboard.
// CONTEXT: Used in the server layout to inject client-only navigation logic.
// DATA FLOW: Uses usePathname to determine current route.
// KEY DEPENDENCIES: React, next/navigation, BackButton
// ----------------------------------------------------------------------------

'use client'

import { usePathname } from 'next/navigation'
import { BackButton } from './BackButton'

/**
 * BackButtonWrapper Component
 *
 * PURPOSE: Renders BackButton unless on /dashboard.
 * CONTEXT: Used in the main layout to keep layout as a server component.
 * INPUTS: None
 * OUTPUTS: Renders BackButton or null
 * ASSUMPTIONS: The dashboard route is always '/dashboard'.
 * EDGE CASES: Handles both '/dashboard' and '/dashboard/'
 *
 * USAGE EXAMPLE:
 *   <BackButtonWrapper />
 */
export function BackButtonWrapper() {
  const pathname = usePathname()
  const isDashboard = pathname === '/dashboard' || pathname === '/dashboard/'
  if (isDashboard) return null
  return <BackButton />
} 