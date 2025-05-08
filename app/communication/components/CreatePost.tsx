"use client";

/**
 * CREATE POST COMPONENT
 * 
 * This component provides a form for creating new posts in the communication feed.
 * It supports text content, image uploads, zone tagging, and post expiration settings.
 * 
 * CONTEXT:
 * The content creation UI for the communication platform, allowing users
 * to share updates, questions, and resources about the library.
 * 
 * DATA FLOW:
 * - Manages form state internally (content, image, zone, expiration)
 * - Handles form submission and validation
 * - Passes the created post object to parent component
 * 
 * KEY DEPENDENCIES:
 * - TextareaAutosize for expandable text input
 * - ZoneSelector for location tagging
 * - ImageUpload for attaching images
 * - extractHashtags utility for parsing hashtags from content
 */

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
import { Post, Topic, Zone } from "../utils/mockCommunicationData";
import ZoneSelector from "./ZoneSelector";
import ImageUpload from "./ImageUpload";
import { extractHashtags } from "../utils/extractHashtags";

interface CreatePostProps {
  onCreatePost: (post: Post) => void;
}

/**
 * Form for creating new posts
 * 
 * @param onCreatePost - Callback function for when a post is created
 * @returns A form component for creating posts
 */
export default function CreatePost({ onCreatePost }: CreatePostProps) {
  // Form state
  const [content, setContent] = useState("");
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [expirationType, setExpirationType] = useState("1hour"); // Default: 1 hour
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Calculate expiration time based on selection
   * 
   * @returns Date object representing when the post will expire
   */
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

  /**
   * Handle form submission
   * Creates a new post object and triggers the callback
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Require either text content or an image
    if (!content.trim() && !imageUrl) return;
    
    setIsSubmitting(true);

    try {
      // Extract hashtags from content and convert to topics
      const hashtags = extractHashtags(content);
      const topics: Topic[] = hashtags.map((tag) => ({
        id: uuidv4(),
        name: tag.substring(1), // Remove the # character
      }));

      // Calculate when the post will expire
      const expiresAt = getExpirationTime();

      // Create new post object
      // In a real app, this would be saved to a database
      const newPost: Post = {
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
        imageUrl,
        expiresAt,
        createdAt: new Date(),
      };

      // Call the callback function with the new post
      onCreatePost(newPost);

      // Reset form state
      setContent("");
      setSelectedZone(null);
      setImageUrl(null);
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Character limit tracking
  const MAX_CHARS = 280;
  const remainingChars = MAX_CHARS - content.length;
  const isOverLimit = remainingChars < 0;

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <form onSubmit={handleSubmit}>
        {/* Text input area */}
        <div className="mb-3">
          <TextareaAutosize
            placeholder="What's happening at the library?"
            className="w-full border rounded-md px-3 py-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxRows={6}
          />

          {/* Character counter */}
          <div className="flex justify-between text-sm mt-1">
            <span
              className={`${isOverLimit ? "text-red-500" : "text-gray-500"}`}
            >
              {remainingChars} characters remaining
            </span>
          </div>
        </div>

        {/* Image preview (if uploaded) */}
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
              aria-label="Remove image"
            >
              ✕
            </button>
          </div>
        )}

        {/* Form controls */}
        <div className="flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-2">
            {/* Image upload button */}
            <ImageUpload onImageSelected={setImageUrl} />
            
            {/* Zone selector dropdown */}
            <ZoneSelector
              selectedZone={selectedZone}
              onSelectZone={setSelectedZone}
            />

            {/* Post expiration time selector */}
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

          {/* Submit button */}
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