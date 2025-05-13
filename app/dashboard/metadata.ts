/**
 * FILE: Dashboard Metadata Configuration
 * 
 * PURPOSE: Defines metadata for the dashboard pages
 * 
 * CONTEXT: Used by Next.js App Router for SEO and page information
 * 
 * DATA FLOW: Exported metadata is used by Next.js to generate HTML head elements
 * 
 * KEY DEPENDENCIES: Next.js Metadata API
 */

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Library Occupancy System",
  description: "Monitor, book, and manage your library spaces with ease.",
}; 