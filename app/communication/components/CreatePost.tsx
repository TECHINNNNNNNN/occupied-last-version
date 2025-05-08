"use client";

/**
 * CREATE POST COMPONENT
 * 
 * Form component for creating new posts in the communication platform.
 * 
 * PURPOSE:
 * Allows users to compose and submit new posts with content, zone tags, 
 * hashtags, images, and expiration time.
 * 
 * CONTEXT:
 * Main input interface for the communication platform that appears at
 * the top of the feed.
 * 
 * DATA FLOW:
 * - Captures user input from form elements
 * - Uses useCommunication hook to submit post to database
 * - Handles image uploads via uploadthing
 * - Extracts hashtags for automatic topic categorization
 * 
 * KEY DEPENDENCIES:
 * - useCommunication hook for data operations
 * - ZoneSelector for selecting library zones
 * - ImageUpload for handling image attachments
 */

import { useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ZoneSelector from "./ZoneSelector";
import ImageUpload from "./ImageUpload";
import { useCommunication } from "../hooks/useCommunication";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function CreatePost() {
  // Get communication context
  const { createPost, zones, currentUser, isSubmitting } = useCommunication();

  // Form state
  const [content, setContent] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [expirationType, setExpirationType] = useState("1"); // Default: 1 hour

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && !imageUrl) return;

    // Convert expiration time to hours
    const expiresInHours = parseInt(expirationType, 10);

    // Submit post
    const success = await createPost(
      content,
      selectedZoneId,
      imageUrl,
      expiresInHours
    );

    if (success) {
      // Reset form
      setContent("");
      setSelectedZoneId(null);
      setImageUrl(null);
    }
  };

  const handleZoneChange = (zoneId: string | null) => {
    setSelectedZoneId(zoneId);
  };

  const remainingChars = 280 - content.length;
  const isOverLimit = remainingChars < 0;

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <form onSubmit={handleSubmit}>
        <div className="flex items-start gap-3 mb-3">
          <Avatar>
            <AvatarImage 
              src={currentUser?.avatar || "/avatars/default.jpg"} 
              alt="Your avatar" 
            />
            <AvatarFallback>
              {currentUser?.name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
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
        </div>

        {imageUrl && (
          <div className="relative mb-3 inline-block">
            <img
              src={imageUrl}
              alt="Upload preview"
              className="h-32 w-auto rounded border object-cover"
              onError={(e) => {
                console.error("Failed to load preview image:", imageUrl);
                e.currentTarget.src = "/images/image-placeholder.svg";
                e.currentTarget.classList.add("broken-preview");
              }}
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
              zones={zones}
              selectedZone={selectedZoneId}
              onSelectZone={handleZoneChange}
            />

            {/* Add expiration time selector */}
            <Select value={expirationType} onValueChange={setExpirationType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Expires in" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="3">3 hours</SelectItem>
                <SelectItem value="6">6 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
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