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
import "../../globals.css";
import { Inter } from 'next/font/google'
import { AuthProvider } from "@/contexts/AuthContext";

import { Toaster } from "@/components/ui/sonner"
// Import BackButton and usePathname for navigation logic
import localFont from 'next/font/local';

const ancizarSerif = localFont({
  src: [
    {
      path: '../../../public/fonts/ancizar-serif/AncizarSerif-VariableFont_wght.ttf',
      style: 'normal',
      weight: '100 900', // Supports all weights in the variable font
    },
    {
      path: '../../../public/fonts/ancizar-serif/AncizarSerif-Italic-VariableFont_wght.ttf',
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



export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    
        <div className={`${geistSans.variable} ${geistMono.variable} ${inter.className} ${ancizarSerif.variable}`}>
            {children}
        </div>
          
           
            
          
       
  );
}
