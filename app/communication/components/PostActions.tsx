"use client";

/**
 * POST ACTIONS COMPONENT
 * 
 * Interaction buttons for social features on communication posts.
 * 
 * PURPOSE:
 * Provides standardized interaction buttons for liking, replying to,
 * and sharing posts in the communication platform.
 * 
 * CONTEXT:
 * Part of the PostCard component, displaying at the bottom of each post
 * to enable user interactions.
 * 
 * DATA FLOW:
 * - Receives post data and interaction callbacks from parent
 * - Manages share popover state internally
 * - Calls parent functions when users take actions
 * 
 * KEY DEPENDENCIES:
 * - shadcn/ui Popover components for share menu
 * - Clipboard API for copy link functionality
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Post } from "../types/communicationTypes";

interface PostActionsProps {
  post: Post;
  onLike: () => void;
  onReply: () => void;
}

/**
 * Action buttons for post interactions
 * 
 * @param post - The post data to display actions for
 * @param onLike - Callback function when like button is clicked
 * @param onReply - Callback function when reply button is clicked
 * @returns A component with social interaction buttons
 */
export default function PostActions({ 
  post, 
  onLike, 
  onReply 
}: PostActionsProps) {
  // Track share popover open state
  const [sharePopoverOpen, setSharePopoverOpen] = useState(false);
  
  // URL for sharing (in a real app, this would be a permalink to the post)
  const [shareUrl, setShareUrl] = useState("");

  /**
   * Handle share button click
   * Generates a shareable URL for the post
   */
  const handleShareClick = () => {
    // In a real app, this would generate a shareable URL for the post
    // For now, we'll use the current URL + post ID
    const url = `${window.location.origin}/communication/post/${post.id}`;
    setShareUrl(url);
    setSharePopoverOpen(true);
  };

  /**
   * Copy link to clipboard
   */
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("Link copied to clipboard!");
      setSharePopoverOpen(false);
    });
  };

  return (
    <div className="flex items-center justify-between sm:justify-start sm:gap-4">
      {/* Like button */}
      <button
        className={`flex items-center gap-1 text-xs sm:text-sm ${
          post.liked ? "text-red-500" : "text-gray-500"
        }`}
        onClick={onLike}
        aria-label={post.liked ? "Unlike post" : "Like post"}
      >
        <span>{post.liked ? "❤️" : "🤍"}</span>
        <span>{post.likeCount}</span>
      </button>

      {/* Reply button */}
      <button
        className="flex items-center gap-1 text-xs sm:text-sm text-gray-500"
        onClick={onReply}
        aria-label="Reply to post"
      >
        <span>💬</span>
        <span>{post.replies.length}</span>
      </button>

      {/* Share button with popover */}
      <Popover open={sharePopoverOpen} onOpenChange={setSharePopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-1 text-xs sm:text-sm text-gray-500"
            onClick={handleShareClick}
            aria-label="Share post"
          >
            <span>🔗</span>
            <span className="hidden sm:inline">Share</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 max-w-[90vw] sm:max-w-xs">
          <div className="space-y-2">
            <p className="text-sm font-medium mb-2">Share to:</p>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleCopyLink} 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-xs sm:text-sm"
              >
                📋 Copy link
              </Button>
              <Button 
                onClick={() => window.open(`mailto:?subject=Library Update&body=${shareUrl}`, "_blank")}
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-xs sm:text-sm"
              >
                ✉️ Email
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 