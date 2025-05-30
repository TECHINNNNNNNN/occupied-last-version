// ============================================================================
// LAYOUT COMPONENT: RootLayout
// PURPOSE: Main application layout, wraps all pages with global providers and shared UI.
// CONTEXT: Used as the root layout for all routes in the Next.js App Router.
// DATA FLOW: Receives children (page content), injects providers and shared components.
// KEY DEPENDENCIES: AuthProvider, OccupancyProvider, Toaster, BackButton, usePathname (Next.js)
//
// This layout now conditionally renders a BackButton at the top of all pages except the dashboard.
// ----------------------------------------------------------------------------

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Inter } from 'next/font/google'
import { AuthProvider } from "@/contexts/AuthContext";
import { OccupancyProvider } from "@/contexts/OccupancyContext";
import { Toaster } from "@/components/ui/sonner"
// Import BackButton and usePathname for navigation logic
import { BackButtonWrapper } from "@/components/BackButtonWrapper";
import localFont from 'next/font/local';

const ancizarSerif = localFont({
  src: [
    {
      path: '../public/fonts/ancizar-serif/AncizarSerif-VariableFont_wght.ttf',
      style: 'normal',
      weight: '100 900', // Supports all weights in the variable font
    },
    {
      path: '../public/fonts/ancizar-serif/AncizarSerif-Italic-VariableFont_wght.ttf',
      style: 'italic',
      weight: '100 900',
    },
  ],
  variable: '--font-ancizar-serif',
  display: 'swap',
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Library Management System",
  description: "Engineering Library Management System",
  icons: {
    icon: '/logolibrary.svg'
  }
};

// RootLayout wraps all pages. Conditionally renders BackButton except on /dashboard.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${inter.className} ${ancizarSerif.variable}`}>
        <AuthProvider>
          {/* Wrap with OccupancyProvider to provide consistent occupancy data */}
          <OccupancyProvider>
            {/* Render BackButtonWrapper at the top; it handles route detection client-side */}
            <BackButtonWrapper />
            {children}
          </OccupancyProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
