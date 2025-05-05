/**
 * Next.js Configuration
 * =====================
 * This file configures Next.js behavior including image optimization,
 * redirects, and other project settings.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  /**
   * Image Configuration
   * ------------------
   * Configures which external domains are allowed as image sources
   * for the Next.js Image component.
   * 
   * Security: Only add trusted domains here as this allows them
   * to serve content to your site.
   */
  images: {
    domains: [
      'images.unsplash.com' // Allow images from Unsplash
    ],
  },
  
  /**
   * Experimental Features
   * -------------------
   * Enable or disable experimental Next.js features
   */
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig 