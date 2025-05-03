# Chulalongkorn Engineering Library Occupancy System

## Project Overview

The Chulalongkorn Engineering Library Occupancy System is a web-based platform designed to help students and faculty monitor, analyze, and manage library space utilization in real-time. The system provides users with up-to-date information on library occupancy levels, allows for room reservations, facilitates student communication, and offers analytical insights into usage patterns.

The interface features a clean, modern design that prioritizes usability and functionality.

### Vision

To create a comprehensive digital solution that optimizes library space utilization, enhances the student experience, and provides valuable data insights for library management, ultimately fostering a more productive and collaborative academic environment.

### Business Objectives

- Increase library resource utilization efficiency by 30% within the first year
- Reduce wait times for study spaces and resources by 40%
- Improve student satisfaction with library services by 25%
- Generate actionable insights for library management to optimize space allocation
- Create a digital platform that can be expanded to other university facilities

## Core Functionalities

### 1. User Authentication and Profiles

- Supabase Authentication
- Role-based access control (student, faculty, staff, admin)
- Profile management with privacy settings
- Activity history and preference settings

### 2. Occupancy Monitoring System

- Real-time visualization of overall library occupancy
- Zone-specific occupancy levels with color-coding
- Integration with physical sensors at entry/exit points
- Trend graphs showing patterns by hour, day, and week
- Predictive occupancy based on historical patterns

### 3. Room Reservation System

- Real-time tracking of room availability
- Intuitive room selection interface with visual timeline
- Same-day only reservation policy for equitable access
- Reservation confirmation and modification
- Drag-to-select time range functionality

### 4. Student Communication Platform

- Topic categorization by subject area
- Thread creation and response functionality
- Content moderation tools
- File attachment support with size limitations
- Rating system for shared resources

### 5. Analytics and Reporting

- Collection and aggregation of usage metrics
- Interactive charts and graphs
- Customizable dashboard views
- Statistical analysis of patterns and trends
- Exportable reports in multiple formats

## Technology Stack

### Frontend

- Next.js (App Router)
- TypeScript for type safety
- Tailwind CSS
- shadcn/ui for component library
- React Hook Form for form handling
- Tanstack Query for data fetching and caching
- Framer Motion for animations
- react-calendar-timeline for room reservation visualization
- @dnd-kit/core for drag-and-drop functionality
- date-fns for date manipulation
- react-hot-toast for notifications

### Backend & Database

- Supabase for authentication and database
- Supabase Row Level Security (RLS) for data protection
- Supabase Realtime for live updates
- Supabase Storage for file uploads
- Supabase Edge Functions for serverless operations
- Next.js API routes for additional server functions

### Data Visualization

- Recharts for standard visualizations
- Nivo for advanced data visualization
- react-grid-layout for customizable dashboards

### Performance & Optimization

- Next.js Image component for optimized images
- Vercel Analytics for performance monitoring
- use-debounce for search and filter optimization
- Supabase caching strategies
- Incremental Static Regeneration for static pages

### Development & Deployment

- ESLint and Prettier for code quality
- Jest and React Testing Library for testing
- GitHub Actions for CI/CD
- Vercel for deployment
- Sentry for error tracking
