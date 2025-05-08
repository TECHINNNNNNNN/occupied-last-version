# Chulalongkorn Engineering Library Communication Platform

## Overview

Implement a Twitter/Instagram-style communication platform where students can share real-time updates about library conditions, coordinate study groups, and post images of available spaces.

## Supabase Database Schema for Communication Platform

Since we're using Supabase for authentication and database, here's the schema with proper foreign key relationships to Supabase Auth:

```sql
-- Create library zones reference table if not already exists
CREATE TABLE IF NOT EXISTS library_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  floor INTEGER NOT NULL,
  description TEXT
);

-- Main posts table with Supabase Auth user_id reference
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  zone_id UUID REFERENCES library_zones(id),
  occupancy_data JSONB,
  image_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- When the post will expire
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Add RLS policy for this table
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Reactions (likes, etc.) with Supabase Auth user_id reference
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id, type)
);

-- Comments/replies with Supabase Auth user_id reference
CREATE TABLE replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hashtags/Topics
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL
);

-- Join table for posts and topics
CREATE TABLE post_topics (
  post_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, topic_id)
);
```

## Supabase Row Level Security (RLS) Policies

Set up proper RLS policies to secure the data:

```sql
-- Enable RLS on all tables
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_topics ENABLE ROW LEVEL SECURITY;

-- Allow users to see all communications
CREATE POLICY "Anyone can view communications"
ON communications FOR SELECT
USING (true);

-- Allow authenticated users to insert their own communications
CREATE POLICY "Authenticated users can insert communications"
ON communications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update/delete only their own communications
CREATE POLICY "Users can update own communications"
ON communications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own communications"
ON communications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Similar policies for reactions and replies
-- [Add additional policies here]
```

### 1. Supabase Client Setup (Updated for 2025)

Create modern Supabase clients for both client and server components using the latest `@supabase/ssr` package:

```typescript
// lib/supabase/client.ts - For client components
import { createBrowserClient } from "@supabase/ssr";
import { type Database } from "@/types/supabase";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// lib/supabase/server.ts - For server components
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type Database } from "@/types/supabase";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle cookie errors
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // Handle cookie errors
          }
        },
      },
    }
  );
}
```

### 2. Middleware for Authentication

```typescript
// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name, options) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect routes that require authentication
  if (!session && request.nextUrl.pathname.startsWith("/communication")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

// See https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: ["/communication/:path*"],
};
```

### 4. Automatic Post Cleanup Function

Create a Supabase Edge Function to automatically clean up expired posts:

```typescript
// supabase/functions/cleanup-expired-posts/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const now = new Date().toISOString();

    // Delete expired posts
    const { error, count } = await supabaseClient
      .from("communications")
      .delete()
      .lt("expires_at", now)
      .select("count");

    if (error) {
      console.error("Error cleaning up expired posts:", error);
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${count} expired posts`,
        deletedCount: count,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 400,
    });
  }
});
```

### 5. Scheduled Supabase Function

Set up a scheduled trigger to run the cleanup function automatically:

```sql
-- In Supabase SQL Editor
select
  cron.schedule(
    'cleanup-expired-posts', -- schedule name
    '*/15 * * * *',          -- every 15 minutes
    $
    select
      net.http_post(
        url:='https://[YOUR-PROJECT-REF].supabase.co/functions/v1/cleanup-expired-posts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer [YOUR-SERVICE-ROLE-KEY]"}'::jsonb
      ) as request_id;
    $
  );
```

## File Structure

```
app/
  communication/
    page.tsx                     # Main page
    components/
      CommunicationFeed.tsx      # Main feed component
      CreatePost.tsx             # Create new post form
      PostCard.tsx               # Individual post display
      PostActions.tsx            # Like, reply, share buttons
      ReplySection.tsx           # Replies/comments section
      ImageUpload.tsx            # Image upload component
      TopicTags.tsx              # Hashtag/topic component
      ZoneSelector.tsx           # Library zone selector dropdown
      FilterBar.tsx              # Filter options for feed
      ExpirationTimer.tsx        # Timer countdown for post expiration
    hooks/
      useCommunication.ts        # Custom hook for post data
    utils/
      extractHashtags.ts         # Utility to parse hashtags from content
      cleanupExpiredPosts.ts     # Server function to remove expired posts
```

## Dependencies to Install

```bash
# Install required packages with latest versions
npm install uploadthing@latest @uploadthing/react@latest react-textarea-autosize@latest date-fns@latest react-share@latest @supabase/ssr@latest @supabase/supabase-js@latest
```

## Getting Started with Implementation

Before diving into the code, make sure you have:

1. **Created an UploadThing Account** - Sign up at [uploadthing.com](https://uploadthing.com) and create a project
2. **Retrieved API Keys** - Get your secret key from the dashboard
3. **Updated Environment Variables** - Add your UploadThing secret key to .env

## Required Imports in Root Layout

Be sure to add the following imports to your root layout file:

```typescript
// app/layout.tsx - Add these imports
import "@uploadthing/react/styles.css"; // Add UploadThing styles
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";
```

And render the NextSSRPlugin in your layout:

```jsx
<NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
```

### 1. Set up UploadThing for Image Uploads

First, we need to set up UploadThing for handling image uploads based on the latest 2025 documentation:

#### 1.1 Add Environment Variables

```
# .env
UPLOADTHING_SECRET=... # Your UploadThing secret key from the dashboard
```

#### 1.2 Create the FileRouter with Supabase Auth Integration (Updated for 2025)

```typescript
// app/api/uploadthing/core.ts
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type Database } from "@/types/supabase";

const f = createUploadthing();

export const ourFileRouter = {
  // Define image uploader route
  imageUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    // Set permissions and authentication using Supabase Auth
    .middleware(async ({ req }) => {
      // Create Supabase server client with latest API
      const cookieStore = cookies();

      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name) {
              return cookieStore.get(name)?.value;
            },
            set(name, value, options) {
              cookieStore.set({ name, value, ...options });
            },
            remove(name, options) {
              cookieStore.set({ name, value: "", ...options });
            },
          },
        }
      );

      // Get current user from Supabase Auth
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // If not authenticated, prevent upload
      if (!session?.user) throw new Error("Unauthorized");

      // Pass user data to onUploadComplete
      return {
        userId: session.user.id,
        userEmail: session.user.email,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code runs on your server after upload completes
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);

      // You can store additional metadata in Supabase here
      const cookieStore = cookies();

      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name) {
              return cookieStore.get(name)?.value;
            },
            set(name, value, options) {
              cookieStore.set({ name, value, ...options });
            },
            remove(name, options) {
              cookieStore.set({ name, value: "", ...options });
            },
          },
        }
      );

      // Store file reference in your Supabase database if needed
      // await supabase.from('user_files').insert({
      //   user_id: metadata.userId,
      //   file_url: file.url,
      //   file_key: file.key,
      //   created_at: new Date().toISOString()
      // });

      // Return data to be used in the client
      return {
        uploadedBy: metadata.userId,
        uploadedAt: new Date().toISOString(),
        fileUrl: file.url,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
```

#### 1.3 Create API Route Handler

```typescript
// app/api/uploadthing/route.ts
import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Export routes for Next App Router
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
```

#### 1.4 Create Upload Components

```typescript
// utils/uploadthing.ts
import {
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

// Generate type-safe upload components
export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
```

#### 1.5 Add Tailwind Configuration

```typescript
// tailwind.config.js
import { withUt } from "uploadthing/tw";

export default withUt({
  // Your existing Tailwind config
  content: ["./app/**/*.{ts,tsx,mdx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
});
```

#### 1.6 Add SSR Optimization

```typescript
// app/layout.tsx
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
        {children}
      </body>
    </html>
  );
}
```

```typescript
// utils/mockCommunicationData.ts
import { v4 as uuidv4 } from "uuid";

export const MOCK_USERS = [
  { id: "user1", name: "Alex Chen", avatar: "/avatars/alex.jpg" },
  { id: "user2", name: "Sarah Kim", avatar: "/avatars/sarah.jpg" },
  { id: "user3", name: "Raj Patel", avatar: "/avatars/raj.jpg" },
  { id: "user4", name: "Maya Johnson", avatar: "/avatars/maya.jpg" },
  { id: "user5", name: "Current User", avatar: "/avatars/default.jpg" },
];

export const MOCK_ZONES = [
  { id: "zone1", name: "Main Reading Area", floor: 1 },
  { id: "zone2", name: "Quiet Study Zone", floor: 1 },
  { id: "zone3", name: "Group Study Rooms", floor: 2 },
  { id: "zone4", name: "Computer Lab", floor: 2 },
  { id: "zone5", name: "Research Commons", floor: 3 },
];

export const MOCK_TOPICS = [
  { id: "topic1", name: "quietspots" },
  { id: "topic2", name: "groupstudy" },
  { id: "topic3", name: "resources" },
  { id: "topic4", name: "examweek" },
  { id: "topic5", name: "events" },
];

export function generateMockPosts(count = 15) {
  const posts = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    // Randomize creation time within last 24 hours
    const createdAt = new Date(
      now.getTime() - Math.random() * 24 * 60 * 60 * 1000
    );

    // Random user
    const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];

    // Random zone (sometimes null)
    const zone =
      Math.random() > 0.2
        ? MOCK_ZONES[Math.floor(Math.random() * MOCK_ZONES.length)]
        : null;

    // Random topics (0-3)
    const topicCount = Math.floor(Math.random() * 3);
    const topics = [];
    for (let j = 0; j < topicCount; j++) {
      const topic = MOCK_TOPICS[Math.floor(Math.random() * MOCK_TOPICS.length)];
      if (!topics.find((t) => t.id === topic.id)) {
        topics.push(topic);
      }
    }

    // Random content based on context
    let content = "";
    const contentTypes = ["status", "question", "resource", "study_group"];
    const type = contentTypes[Math.floor(Math.random() * contentTypes.length)];

    switch (type) {
      case "status":
        if (zone) {
          const isBusy = Math.random() > 0.5;
          content = isBusy
            ? `${zone.name} is really packed right now! Almost no seats available.`
            : `${zone.name} is surprisingly empty today. Great time to grab a spot!`;
        } else {
          content =
            "Library is " +
            (Math.random() > 0.5 ? "quite busy" : "relatively quiet") +
            " this " +
            (createdAt.getHours() < 12
              ? "morning"
              : createdAt.getHours() < 17
              ? "afternoon"
              : "evening") +
            ".";
        }
        break;
      case "question":
        content =
          Math.random() > 0.5
            ? "Does anyone know if there are any study rooms available right now?"
            : `Is the ${
                MOCK_ZONES[Math.floor(Math.random() * MOCK_ZONES.length)].name
              } usually busy on ${
                [
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ][Math.floor(Math.random() * 7)]
              } evenings?`;
        break;
      case "resource":
        content =
          Math.random() > 0.5
            ? "Just found some great engineering textbooks on the second floor, shelf C5."
            : "The library just got new charging stations installed at all the tables in the main area!";
        break;
      case "study_group":
        content = `Looking for study partners for ${
          ["Calculus", "Physics", "Data Structures", "Chemistry", "EE Basics"][
            Math.floor(Math.random() * 5)
          ]
        } final exam. Meeting in ${
          MOCK_ZONES[Math.floor(Math.random() * MOCK_ZONES.length)].name
        } tomorrow at ${Math.floor(Math.random() * 12) + 1}${
          Math.random() > 0.5 ? "pm" : "am"
        }.`;
        break;
    }

    // Add hashtags for topics
    if (topics.length > 0) {
      content += " " + topics.map((t) => "#" + t.name).join(" ");
    }

    // Random like count
    const likeCount = Math.floor(Math.random() * 20);

    // Random replies (0-5)
    const replyCount = Math.floor(Math.random() * 5);
    const replies = [];
    for (let j = 0; j < replyCount; j++) {
      const replyUser =
        MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
      const replyTime = new Date(
        createdAt.getTime() +
          Math.random() * (now.getTime() - createdAt.getTime())
      );

      let replyContent = "";
      if (type === "status") {
        replyContent =
          Math.random() > 0.5
            ? "Thanks for the update!"
            : "Really? Just checked and it changed a lot since then.";
      } else if (type === "question") {
        replyContent =
          Math.random() > 0.5
            ? "Yes, there are two rooms available right now."
            : "Usually gets busy after 3pm, better come early.";
      } else if (type === "resource") {
        replyContent = "That's really helpful, thanks for sharing!";
      } else if (type === "study_group") {
        replyContent =
          Math.random() > 0.5
            ? "I'd like to join! See you there."
            : "What topics are you focusing on?";
      }

      replies.push({
        id: `reply${i}-${j}`,
        user: replyUser,
        content: replyContent,
        createdAt: replyTime,
      });
    }

    // Random image (30% chance)
    const hasImage = Math.random() < 0.3;
    const imageUrl = hasImage
      ? `/mock/library-image-${Math.floor(Math.random() * 5) + 1}.jpg`
      : null;

    // Generate random expiration time (between 10 minutes and 24 hours from creation)
    const expirationOptions = [
      60 * 60 * 1000, // 1 hour
      3 * 60 * 60 * 1000, // 3 hours
      6 * 60 * 60 * 1000, // 6 hours
      24 * 60 * 60 * 1000, // 24 hours
    ];
    const expirationTime =
      expirationOptions[Math.floor(Math.random() * expirationOptions.length)];
    const expiresAt = new Date(createdAt.getTime() + expirationTime);

    // Create post object
    posts.push({
      id: `post${i}`,
      user,
      content,
      zone,
      topics,
      likeCount,
      liked: Math.random() > 0.7, // 30% chance current user liked it
      replies: replies.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      ),
      imageUrl,
      expiresAt, // Add expiration time
      createdAt,
    });
  }

  // Sort by creation time (newest first)
  return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
```

### 2. Create Main Communication Page

```typescript
// app/communication/page.tsx
import CommunicationFeed from "./components/CommunicationFeed";

export default function CommunicationPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Library Community</h1>
      <CommunicationFeed />
    </div>
  );
}
```

### 3. Create CommunicationFeed Component

```typescript
// app/communication/components/CommunicationFeed.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { generateMockPosts } from "../utils/mockCommunicationData";
import CreatePost from "./CreatePost";
import PostCard from "./PostCard";
import FilterBar from "./FilterBar";

export default function CommunicationFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all', 'zone:{zoneId}', 'topic:{topicName}'

  // Function to check and remove expired posts
  const removeExpiredPosts = useCallback(() => {
    const now = new Date();
    setPosts((currentPosts) =>
      currentPosts.filter((post) => {
        return !post.expiresAt || new Date(post.expiresAt) > now;
      })
    );
  }, []);

  useEffect(() => {
    // In real app, fetch from API
    const mockPosts = generateMockPosts(15);

    // Filter out already expired posts on initial load
    const now = new Date();
    const validPosts = mockPosts.filter((post) => {
      return !post.expiresAt || new Date(post.expiresAt) > now;
    });

    setPosts(validPosts);
    setLoading(false);

    // Set up interval to check for expired posts every minute
    const intervalId = setInterval(removeExpiredPosts, 60000);

    return () => clearInterval(intervalId);
  }, [removeExpiredPosts]);

  const handleCreatePost = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  const handleLikePost = (postId) => {
    setPosts(
      posts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            liked: !post.liked,
            likeCount: post.liked ? post.likeCount - 1 : post.likeCount + 1,
          };
        }
        return post;
      })
    );
  };

  const handleAddReply = (postId, reply) => {
    setPosts(
      posts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            replies: [...post.replies, reply],
          };
        }
        return post;
      })
    );
  };

  // Filter posts based on current filter
  const filteredPosts = posts.filter((post) => {
    if (filter === "all") return true;

    if (filter.startsWith("zone:")) {
      const zoneId = filter.split(":")[1];
      return post.zone && post.zone.id === zoneId;
    }

    if (filter.startsWith("topic:")) {
      const topicName = filter.split(":")[1];
      return post.topics.some((topic) => topic.name === topicName);
    }

    return true;
  });

  if (loading) {
    return <div className="text-center p-8">Loading community posts...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <CreatePost onCreatePost={handleCreatePost} />

      <div className="my-6">
        <FilterBar currentFilter={filter} onFilterChange={setFilter} />
      </div>

      <div className="space-y-6">
        {filteredPosts.length === 0 ? (
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No posts matching your filter.</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={() => handleLikePost(post.id)}
              onAddReply={(reply) => handleAddReply(post.id, reply)}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

### 4. Create Post Creation Component

```typescript
// app/communication/components/CreatePost.tsx
"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { addHours } from "date-fns";
import TextareaAutosize from "react-textarea-autosize";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MOCK_ZONES } from "../utils/mockCommunicationData";
import ZoneSelector from "./ZoneSelector";
import ImageUpload from "./ImageUpload";
import { extractHashtags } from "../utils/extractHashtags";

export default function CreatePost({ onCreatePost }) {
  const [content, setContent] = useState("");
  const [selectedZone, setSelectedZone] = useState(null);
  const [imageUrl, setImageUrl] = useState(null); // Changed to store URL instead of file
  const [expirationType, setExpirationType] = useState("1hour"); // Default: 1 hour
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate expiration time based on selection
  const getExpirationTime = () => {
    const now = new Date();

    switch (expirationType) {
      case "1hour":
        return addHours(now, 1);
      case "3hours":
        return addHours(now, 3);
      case "6hours":
        return addHours(now, 6);
      case "24hours":
        return addHours(now, 24);
      default:
        return addHours(now, 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim() && !imageUrl) return;
    setIsSubmitting(true);

    try {
      // Extract hashtags from content
      const hashtags = extractHashtags(content);
      const topics = hashtags.map((tag) => ({
        id: uuidv4(),
        name: tag.substring(1), // Remove the # character
      }));

      // Get expiration time
      const expiresAt = getExpirationTime();

      // Create new post object
      const newPost = {
        id: uuidv4(),
        user: {
          id: "user5", // Current user from mock data
          name: "Current User",
          avatar: "/avatars/default.jpg",
        },
        content,
        zone: selectedZone,
        topics,
        likeCount: 0,
        liked: false,
        replies: [],
        imageUrl, // Now this is the URL from UploadThing
        expiresAt,
        createdAt: new Date(),
      };

      // In a real app, you would submit to Supabase here

      // Call the parent handler
      onCreatePost(newPost);

      // Reset form
      setContent("");
      setSelectedZone(null);
      setImageUrl(null);
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingChars = 280 - content.length;
  const isOverLimit = remainingChars < 0;

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <TextareaAutosize
            placeholder="What's happening at the library?"
            className="w-full border rounded-md px-3 py-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxRows={6}
          />

          <div className="flex justify-between text-sm mt-1">
            <span
              className={`${isOverLimit ? "text-red-500" : "text-gray-500"}`}
            >
              {remainingChars} characters remaining
            </span>
          </div>
        </div>

        {imageUrl && (
          <div className="relative mb-3 inline-block">
            <img
              src={imageUrl}
              alt="Upload preview"
              className="h-32 w-auto rounded border object-cover"
            />
            <button
              type="button"
              className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 text-white"
              onClick={() => setImageUrl(null)}
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-2">
            <ImageUpload onImageSelected={setImageUrl} />
            <ZoneSelector
              selectedZone={selectedZone}
              onSelectZone={setSelectedZone}
            />

            {/* Add expiration time selector */}
            <Select value={expirationType} onValueChange={setExpirationType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Expires in" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1hour">1 hour</SelectItem>
                <SelectItem value="3hours">3 hours</SelectItem>
                <SelectItem value="6hours">6 hours</SelectItem>
                <SelectItem value="24hours">24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={
              isSubmitting || (content.length === 0 && !imageUrl) || isOverLimit
            }
          >
            {isSubmitting ? "Posting..." : "Post"}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

### 5. Create ZoneSelector Component

```typescript
// app/communication/components/ZoneSelector.tsx
"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MOCK_ZONES } from "../utils/mockCommunicationData";

export default function ZoneSelector({ selectedZone, onSelectZone }) {
  const handleSelectZone = (zoneId) => {
    if (zoneId === "none") {
      onSelectZone(null);
      return;
    }

    const zone = MOCK_ZONES.find((zone) => zone.id === zoneId);
    onSelectZone(zone);
  };

  return (
    <Select value={selectedZone?.id || "none"} onValueChange={handleSelectZone}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Tag a library zone" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No zone tag</SelectItem>
        {MOCK_ZONES.map((zone) => (
          <SelectItem key={zone.id} value={zone.id}>
            {zone.name} (Floor {zone.floor})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### 6. Create ImageUpload Component

```typescript
// app/communication/components/ImageUpload.tsx
"use client";

import { useState } from "react";
import { UploadDropzone } from "@/utils/uploadthing";
import { Button } from "@/components/ui/button";

export default function ImageUpload({ onImageSelected }) {
  const [isUploading, setIsUploading] = useState(false);

  return (
    <div>
      <UploadDropzone
        endpoint="imageUploader"
        onUploadBegin={() => {
          setIsUploading(true);
        }}
        onClientUploadComplete={(res) => {
          // This callback is called when upload is completed
          setIsUploading(false);
          if (res && res.length > 0) {
            // Pass the uploaded image URL to parent component
            onImageSelected(res[0].fileUrl);
          }
        }}
        onUploadError={(error) => {
          setIsUploading(false);
          console.error("Upload error:", error);
          alert("Upload failed: " + error.message);
        }}
        className={isUploading ? "opacity-50" : ""}
        appearance={{
          button: {
            backgroundColor: "#0095f6",
            color: "white",
            padding: "6px 12px",
            borderRadius: "4px",
            fontWeight: "500",
            fontSize: "14px",
          },
          label: { color: "#262626", fontSize: "14px" },
          allowedContent: {
            color: "#8e8e8e",
            fontSize: "12px",
          },
        }}
        content={{
          buttonText: "📷 Upload Image",
          allowedContent: "Images up to 4MB",
        }}
      />
    </div>
  );
}
```

### 7. Create PostCard Component

```typescript
// app/communication/components/PostCard.tsx
"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PostActions from "./PostActions";
import ReplySection from "./ReplySection";
import TopicTags from "./TopicTags";
import ExpirationTimer from "./ExpirationTimer";

export default function PostCard({ post, onLike, onAddReply }) {
  const [showReplies, setShowReplies] = useState(false);

  const toggleReplies = () => {
    setShowReplies(!showReplies);
  };

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      {/* Post header */}
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarImage src={post.user.avatar} alt={post.user.name} />
          <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-sm">{post.user.name}</h3>
              <p className="text-gray-500 text-xs">
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Expiration timer */}
              {post.expiresAt && <ExpirationTimer expiresAt={post.expiresAt} />}

              {post.zone && (
                <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                  {post.zone.name}
                </div>
              )}
            </div>
          </div>

          {/* Post content */}
          <div className="mt-2">
            <p className="whitespace-pre-wrap break-words">{post.content}</p>

            {/* Image (if any) */}
            {post.imageUrl && (
              <div className="mt-3">
                <img
                  src={post.imageUrl}
                  alt="Post attachment"
                  className="rounded-md max-h-96 w-auto object-contain"
                />
              </div>
            )}

            {/* Topic tags */}
            {post.topics.length > 0 && (
              <div className="mt-2">
                <TopicTags topics={post.topics} />
              </div>
            )}
          </div>

          {/* Post actions */}
          <div className="mt-3">
            <PostActions post={post} onLike={onLike} onReply={toggleReplies} />
          </div>

          {/* Replies section */}
          {(showReplies || post.replies.length > 0) && (
            <div className="mt-3">
              <ReplySection
                postId={post.id}
                replies={post.replies}
                onAddReply={onAddReply}
                isExpanded={showReplies}
                onToggle={toggleReplies}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 8. Create PostActions Component

```typescript
// app/communication/components/PostActions.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FacebookShareButton,
  TwitterShareButton,
  FacebookIcon,
  TwitterIcon,
  EmailShareButton,
  EmailIcon,
} from "react-share";

export default function PostActions({ post, onLike, onReply }) {
  const [shareUrl, setShareUrl] = useState("");
  const [sharePopoverOpen, setSharePopoverOpen] = useState(false);

  // Generate share URL when popover opens
  const handleShareClick = () => {
    // In a real app, this would generate a shareable URL for the post
    // For now, we'll use the current URL + post ID
    const url = `${window.location.origin}/communication/post/${post.id}`;
    setShareUrl(url);
    setSharePopoverOpen(true);
  };

  // Prepare share title based on post content
  const shareTitle =
    post.content.length > 50
      ? `${post.content.substring(0, 50)}...`
      : post.content;

  const shareMessage = `Check out this update from the Chulalongkorn Engineering Library: ${shareTitle}`;

  // Instagram doesn't have a direct share button via react-share
  // Instead, we'll provide a method to copy the link or share via email instead
  const handleInstagramShare = () => {
    // Copy to clipboard then suggest opening Instagram
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("Link copied! You can now paste it in Instagram.");
    });
  };

  return (
    <div className="flex items-center gap-4">
      <button
        className={`flex items-center gap-1 text-sm ${
          post.liked ? "text-red-500" : "text-gray-500"
        }`}
        onClick={onLike}
      >
        <span>{post.liked ? "❤️" : "🤍"}</span>
        <span>{post.likeCount}</span>
      </button>

      <button
        className="flex items-center gap-1 text-sm text-gray-500"
        onClick={onReply}
      >
        <span>💬</span>
        <span>{post.replies.length}</span>
      </button>

      <Popover open={sharePopoverOpen} onOpenChange={setSharePopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-1 text-sm text-gray-500"
            onClick={handleShareClick}
          >
            <span>🔗</span>
            <span>Share</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3">
          <div className="space-y-2">
            <p className="text-sm font-medium mb-2">Share to:</p>
            <div className="flex gap-3">
              <FacebookShareButton url={shareUrl} quote={shareMessage}>
                <FacebookIcon size={32} round />
              </FacebookShareButton>

              <TwitterShareButton url={shareUrl} title={shareMessage}>
                <TwitterIcon size={32} round />
              </TwitterShareButton>

              <button
                onClick={handleInstagramShare}
                className="flex items-center justify-center bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full w-8 h-8"
              >
                <span className="text-white text-lg">📸</span>
              </button>

              <EmailShareButton
                url={shareUrl}
                subject="Library Update"
                body={shareMessage}
              >
                <EmailIcon size={32} round />
              </EmailShareButton>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

### 9. Create ReplySection Component

```typescript
// app/communication/components/ReplySection.tsx
"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import TextareaAutosize from "react-textarea-autosize";

export default function ReplySection({
  postId,
  replies,
  onAddReply,
  isExpanded,
  onToggle,
}) {
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReply = async (e) => {
    e.preventDefault();

    if (!replyContent.trim()) return;
    setIsSubmitting(true);

    try {
      // Create new reply object
      const newReply = {
        id: uuidv4(),
        user: {
          id: "user5", // Current user from mock data
          name: "Current User",
          avatar: "/avatars/default.jpg",
        },
        content: replyContent,
        createdAt: new Date(),
      };

      // In a real app, you would submit to Supabase here

      // Call the parent handler
      onAddReply(newReply);

      // Reset form
      setReplyContent("");
    } catch (error) {
      console.error("Error creating reply:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const shouldShowViewButton = replies.length > 0 && !isExpanded;

  return (
    <div className="pl-2 border-l-2 border-gray-100">
      {/* View replies button */}
      {shouldShowViewButton && (
        <button
          className="text-sm text-blue-600 hover:text-blue-800 mt-2"
          onClick={onToggle}
        >
          View {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </button>
      )}

      {/* Reply list */}
      {isExpanded && replies.length > 0 && (
        <div className="space-y-3 my-3">
          {replies.map((reply) => (
            <div key={reply.id} className="flex items-start gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={reply.user.avatar} alt={reply.user.name} />
                <AvatarFallback>{reply.user.name.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="bg-gray-50 rounded-md p-2 flex-1">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-xs">{reply.user.name}</span>
                  <span className="text-gray-500 text-xs">
                    {formatDistanceToNow(new Date(reply.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-sm mt-1">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply form */}
      {isExpanded && (
        <form onSubmit={handleSubmitReply} className="mt-3">
          <div className="flex items-start gap-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src="/avatars/default.jpg" alt="Current User" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <TextareaAutosize
                placeholder="Write a reply..."
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                maxRows={4}
              />

              <div className="flex justify-end mt-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || replyContent.length === 0}
                >
                  {isSubmitting ? "Sending..." : "Reply"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
```

### 10. Create TopicTags Component

```typescript
// app/communication/components/TopicTags.tsx
"use client";

export default function TopicTags({ topics }) {
  return (
    <div className="flex flex-wrap gap-1">
      {topics.map((topic) => (
        <div
          key={topic.id}
          className="px-2 py-0.5 bg-gray-100 text-blue-600 rounded-full text-xs hover:bg-gray-200 cursor-pointer"
        >
          #{topic.name}
        </div>
      ))}
    </div>
  );
}
```

### 11. Create FilterBar Component

```typescript
// app/communication/components/FilterBar.tsx
"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MOCK_ZONES, MOCK_TOPICS } from "../utils/mockCommunicationData";

export default function FilterBar({ currentFilter, onFilterChange }) {
  const [selectedTab, setSelectedTab] = useState("all");

  const handleTabChange = (value) => {
    setSelectedTab(value);

    if (value === "all") {
      onFilterChange("all");
    }
  };

  const handleZoneSelect = (zoneId) => {
    onFilterChange(`zone:${zoneId}`);
  };

  const handleTopicSelect = (topicName) => {
    onFilterChange(`topic:${topicName}`);
  };

  return (
    <div className="space-y-2">
      <Tabs
        defaultValue="all"
        value={selectedTab}
        onValueChange={handleTabChange}
      >
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">All Posts</TabsTrigger>
          <TabsTrigger value="zones">Zones</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
        </TabsList>
      </Tabs>

      {selectedTab === "zones" && (
        <div className="flex flex-wrap gap-2 mt-2">
          {MOCK_ZONES.map((zone) => (
            <button
              key={zone.id}
              className={`px-3 py-1 text-sm rounded-full ${
                currentFilter === `zone:${zone.id}`
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => handleZoneSelect(zone.id)}
            >
              {zone.name}
            </button>
          ))}
        </div>
      )}

      {selectedTab === "topics" && (
        <div className="flex flex-wrap gap-2 mt-2">
          {MOCK_TOPICS.map((topic) => (
            <button
              key={topic.id}
              className={`px-3 py-1 text-sm rounded-full ${
                currentFilter === `topic:${topic.name}`
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => handleTopicSelect(topic.name)}
            >
              #{topic.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 12. Create Hashtag Extraction Utility

```typescript
// app/communication/utils/extractHashtags.ts
export function extractHashtags(text) {
  // Regular expression to match hashtags (word starting with # followed by letters/numbers)
  const regex = /#(\w+)/g;
  const matches = text.match(regex) || [];

  // Return unique hashtags
  return [...new Set(matches)];
}
```

### 13. Create ExpirationTimer Component

```typescript
// app/communication/components/ExpirationTimer.tsx
"use client";

import { useState, useEffect } from "react";
import {
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
} from "date-fns";

interface ExpirationTimerProps {
  expiresAt: Date;
}

export default function ExpirationTimer({ expiresAt }: ExpirationTimerProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [percentage, setPercentage] = useState(100);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const expirationDate = new Date(expiresAt);

      if (now >= expirationDate) {
        setTimeLeft("Expired");
        setPercentage(0);
        return;
      }

      // Calculate total seconds from creation to expiration
      const creationTime = expirationDate.getTime() - 60 * 60 * 1000; // Assuming 1 hour default
      const totalDuration = expirationDate.getTime() - creationTime;

      // Calculate remaining time
      const timeRemaining = expirationDate.getTime() - now.getTime();

      // Calculate percentage remaining
      const percentRemaining = (timeRemaining / totalDuration) * 100;
      setPercentage(Math.max(0, Math.min(100, percentRemaining)));

      // Format time remaining
      const hoursLeft = differenceInHours(expirationDate, now);
      if (hoursLeft > 0) {
        setTimeLeft(`${hoursLeft}h left`);
        return;
      }

      const minutesLeft = differenceInMinutes(expirationDate, now);
      if (minutesLeft > 0) {
        setTimeLeft(`${minutesLeft}m left`);
        return;
      }

      const secondsLeft = differenceInSeconds(expirationDate, now);
      setTimeLeft(`${secondsLeft}s left`);
    };

    // Update time left every second
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  // Determine color based on time left
  const getColor = () => {
    if (percentage > 50) return "text-green-500";
    if (percentage > 25) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Visual indicator (circle that empties) */}
      <div className="relative w-4 h-4">
        <svg viewBox="0 0 36 36" className="w-4 h-4">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#e6e6e6"
            strokeWidth="4"
            strokeDasharray="100, 100"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={`${percentage}, 100`}
            className={getColor()}
          />
        </svg>
      </div>
      <span className={`text-xs font-medium ${getColor()}`}>{timeLeft}</span>
    </div>
  );
}
```

### 14. Create Expired Posts Cleanup Utility

```typescript
// app/communication/utils/cleanupExpiredPosts.ts
// For use with Supabase Edge Functions in production

export async function cleanupExpiredPosts(supabaseClient) {
  const now = new Date().toISOString();

  // Delete expired posts
  const { error, count } = await supabaseClient
    .from("communications")
    .delete()
    .lt("expires_at", now)
    .select("count");

  if (error) {
    console.error("Error cleaning up expired posts:", error);
    return { success: false, error };
  }

  return {
    success: true,
    deletedCount: count,
  };
}

// To be set up as a scheduled function in production
// Example of how to call this from Supabase Edge Function:
/*
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { cleanupExpiredPosts } from '../utils/cleanupExpiredPosts.ts'

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )
  
  const result = await cleanupExpiredPosts(supabaseClient);
  
  return new Response(
    JSON.stringify(result),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
*/
```

### 5. Automatic Post Cleanup Function (Updated for 2025)

```typescript
// supabase/functions/cleanup-expired-posts/index.ts
import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with latest version
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const now = new Date().toISOString();

    // Delete expired posts
    const { error, count } = await supabaseClient
      .from("communications")
      .delete()
      .lt("expires_at", now)
      .select("count");

    if (error) {
      console.error("Error cleaning up expired posts:", error);
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${count} expired posts`,
        deletedCount: count,
        timestamp: now,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 400,
    });
  }
});
```

### 6. Modern Scheduled Cleanup with Supabase

Set up a scheduled trigger with the latest Supabase syntax:

```sql
-- In Supabase SQL Editor
select
  cron.schedule(
    'cleanup-expired-posts',             -- schedule name
    '*/15 * * * *',                      -- every 15 minutes
    $
    select
      net.http_post(
        url:=>'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/cleanup-expired-posts',
        headers:=>jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.edge_function_key')
        )
      ) as request_id;
    $
  );
```

### 7. Profile Update Utility Function

```typescript
// utils/profileUtils.ts
import { createClient } from "@/lib/supabase/client";

export async function uploadProfileImage(file: File) {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error("Not authenticated");
    }

    // Generate a unique file path
    const userId = session.user.id;
    const fileExt = file.name.split(".").pop();
    const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

    // Upload image to Supabase Storage
    const { data, error } = await supabase.storage
      .from("profiles")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("profiles").getPublicUrl(filePath);

    // Update user profile with new avatar URL
    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    return publicUrl;
  } catch (error) {
    console.error("Error uploading profile image:", error);
    throw error;
  }
}
```

## Instagram-Style UI Guidelines

To achieve an Instagram-like user interface, follow these styling guidelines:

### 1. Color Scheme & Typography

```css
/* Instagram-inspired styles */
:root {
  /* Colors */
  --instagram-primary: #262626;
  --instagram-secondary: #8e8e8e;
  --instagram-background: #fafafa;
  --instagram-border: #dbdbdb;
  --instagram-blue: #0095f6;
  --instagram-red: #ed4956;

  /* Instagram gradient */
  --instagram-gradient: linear-gradient(
    45deg,
    #f09433 0%,
    #e6683c 25%,
    #dc2743 50%,
    #cc2366 75%,
    #bc1888 100%
  );

  /* Typography */
  --instagram-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    Helvetica, Arial, sans-serif;
}

body {
  font-family: var(--instagram-font);
  background-color: var(--instagram-background);
  color: var(--instagram-primary);
}
```

### 2. Post Card Styling

Implement these Instagram-style post card features:

- Clean white cards with thin borders
- Full-width images with square aspect ratio
- Consistent padding around content (16px)
- Username and avatar in header
- Like, comment, and share icons in action bar
- Username repeated before caption text

### 3. Component Structure

Update the PostCard component to follow Instagram's layout:

```jsx
<div className="bg-white border border-[#dbdbdb] rounded-sm mb-4">
  {/* Header with user info and expiration */}
  <div className="flex items-center p-4">
    <div className="rounded-full overflow-hidden h-8 w-8 mr-3">
      <img
        src={post.user.avatar}
        alt={post.user.name}
        className="h-full w-full object-cover"
      />
    </div>
    <div className="flex-1">
      <p className="font-semibold text-sm">{post.user.name}</p>
      {post.zone && <p className="text-xs text-[#8e8e8e]">{post.zone.name}</p>}
    </div>
    {post.expiresAt && (
      <InstagramStyleExpirationTimer expiresAt={post.expiresAt} />
    )}
  </div>

  {/* Double-tappable image area */}
  {post.imageUrl && (
    <div
      className="w-full aspect-square bg-[#fafafa]"
      onDoubleClick={() => handleDoubleTap(post.id)}
    >
      <img
        src={post.imageUrl}
        alt="Post content"
        className="w-full h-full object-cover"
      />

      {/* Heart animation on double-tap */}
      {animatingPost === post.id && (
        <div className="absolute inset-0 flex items-center justify-center">
          <HeartIcon className="text-white text-6xl animate-scale-and-fade" />
        </div>
      )}
    </div>
  )}

  {/* Action buttons */}
  <div className="p-4 pb-2">
    <InstagramStyleActions
      post={post}
      onLike={onLike}
      onReply={onReply}
      onShare={handleShare}
    />

    {/* Like count */}
    {post.likeCount > 0 && (
      <p className="text-sm font-semibold mt-2">{post.likeCount} likes</p>
    )}
  </div>

  {/* Caption */}
  <div className="px-4 pb-2">
    <p className="text-sm">
      <span className="font-semibold mr-1">{post.user.name}</span>
      <span>{post.content}</span>
    </p>

    {/* Hashtags */}
    {post.topics.length > 0 && (
      <div className="mt-1">
        <InstagramStyleHashtags topics={post.topics} />
      </div>
    )}

    {/* Timestamp */}
    <p className="text-[10px] text-[#8e8e8e] mt-1 uppercase">
      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
    </p>
  </div>

  {/* Comments section */}
  <InstagramStyleComments
    postId={post.id}
    replies={post.replies}
    onAddReply={onAddReply}
    isExpanded={showReplies}
    onToggle={toggleReplies}
  />
</div>
```

### 4. Instagram-Style Timeline

Make the feed look like Instagram's by implementing:

- Narrow, centered column (max-width: 470px for mobile-centric look)
- No gap between posts (or very minimal)
- Stories row at the top (can be implemented later)
- Simple post creation button
- White post cards on light gray background

### 5. Double-Tap to Like

Add this Instagram signature feature:

```jsx
// In PostCard component
const [animatingPost, setAnimatingPost] = useState(null);

const handleDoubleTap = (postId) => {
  if (!post.liked) {
    onLike(postId);

    // Start heart animation
    setAnimatingPost(post.id);
    setTimeout(() => setAnimatingPost(null), 1000);
  }
};

// Add onDoubleClick to post image area
<div
  className="w-full aspect-square"
  onDoubleClick={() => handleDoubleTap(post.id)}
>
  {/* Image content */}
</div>;
```

### 6. Instagram-Style Expiration Timer

Replace the circle timer with Instagram Stories-style progress bar:

```jsx
const InstagramStyleExpirationTimer = ({ expiresAt }) => {
  const [percentage, setPercentage] = useState(100);

  // Timer calculation logic

  return (
    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full"
        style={{
          width: `${percentage}%`,
          background: "var(--instagram-gradient)",
          transition: "width 1s linear",
        }}
      />
    </div>
  );
};
```

### 7. Instagram-Inspired Action Icons

Use SVG icons similar to Instagram's:

```jsx
// Like icon
<svg aria-label="Like" height="24" role="img" viewBox="0 0 24 24" width="24">
  <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 8.903c0 3.452-3.33 6.448-8.14 10.402l-.13.11-.41.37c-.325.29-.664.59-1.02.9-2.19 1.9-6.002 5.2-6.002 5.2l-1.56-1.88.16-.15.41-.37c4.02-3.74 7.29-6.73 7.29-9.62 0-2.3-1.88-4.17-4.2-4.17-1.98 0-3.32 1.12-3.55 2.93H11c.28-4.39 4.25-5.69 7.92-3.56z" fill={post.liked ? '#ed4956' : 'none'} stroke="currentColor" strokeWidth="2"/>
</svg>

// Comment icon
<svg aria-label="Comment" height="24" role="img" viewBox="0 0 24 24" width="24">
  <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2"/>
</svg>

// Share icon
<svg aria-label="Share" height="24" role="img" viewBox="0 0 24 24" width="24">
  <line fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" x1="22" x2="9.218" y1="3" y2="10.083"/>
  <polygon fill="none" points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334" stroke="currentColor" strokeLinejoin="round" strokeWidth="2"/>
</svg>
```

### 8. Create Post UI Styling

Style the post creation form like Instagram's create post form:

```jsx
<div className="bg-white border border-[#dbdbdb] rounded-sm mb-6">
  <div className="p-4">
    <div className="flex items-start space-x-3">
      <div className="rounded-full overflow-hidden h-8 w-8">
        <img
          src="/avatars/default.jpg"
          alt="Your profile"
          className="h-full w-full object-cover"
        />
      </div>

      <TextareaAutosize
        placeholder="What's happening at the library?"
        className="flex-1 border-none resize-none bg-transparent outline-none text-sm"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxRows={6}
      />
    </div>

    {imageUrl && (
      <div className="mt-3 relative">
        <img
          src={imageUrl}
          alt="Upload preview"
          className="w-full h-64 object-cover rounded"
        />
        <button
          type="button"
          className="absolute top-2 right-2 bg-black bg-opacity-60 rounded-full p-1 text-white"
          onClick={() => setImageUrl(null)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    )}

    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#dbdbdb]">
      <div className="flex items-center space-x-4">
        <ImageUpload onImageSelected={setImageUrl} />
        <ZoneSelector
          selectedZone={selectedZone}
          onSelectZone={setSelectedZone}
        />
        <ExpirationSelector
          value={expirationType}
          onChange={setExpirationType}
        />
      </div>

      <button
        type="submit"
        disabled={
          isSubmitting || (content.length === 0 && !imageUrl) || isOverLimit
        }
        className={`text-sm font-semibold ${
          isSubmitting || (content.length === 0 && !imageUrl) || isOverLimit
            ? "text-[#0095f6]/40"
            : "text-[#0095f6]"
        }`}
      >
        {isSubmitting ? "Posting..." : "Post"}
      </button>
    </div>
  </div>
</div>
```

## Future Enhancements

1. **Real-time updates** using Supabase subscriptions
2. **User profiles** showing post history
3. **Notifications** when someone replies to your post
4. **Moderation tools** for admins
5. **Rich text formatting** for posts
6. **Advanced search** to find specific content
7. **Embedded occupancy widgets** to share current library status
8. **Story highlights** - Allow users to save important posts beyond their expiration time
9. **Reaction options** - Add more types of reactions beyond just likes
10. **Visual theming** - Implement Y2K or space theme design once core functionality is complete
