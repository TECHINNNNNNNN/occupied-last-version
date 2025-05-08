"use client";

/**
 * IMAGE UPLOAD COMPONENT
 * 
 * This component provides a button to upload images for posts.
 * For this demo, it uses a simplified mock implementation.
 * 
 * CONTEXT:
 * Part of the post creation workflow, allowing users to attach
 * images to their posts for visual sharing.
 * 
 * DATA FLOW:
 * - Receives callback for when an image is selected
 * - Handles file selection internally
 * - Passes image URL to parent when upload completes
 * 
 * KEY DEPENDENCIES:
 * - Browser File API for handling file inputs
 */

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  onImageSelected: (imageUrl: string) => void;
}

/**
 * Button that opens file picker for image uploads
 * 
 * @param onImageSelected - Callback function when an image is selected
 * @returns A button component that triggers file selection
 */
export default function ImageUpload({ onImageSelected }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle file selection from the file input
   * In a real app, this would upload to a server/CDN
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File validation
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      alert("File size should be less than 4MB");
      return;
    }

    setIsUploading(true);

    // Simulate upload with a local object URL
    // In a real app, this would be an async upload to a server
    try {
      // Create a local URL for the selected image
      const imageUrl = URL.createObjectURL(file);
      
      // Simulate network delay
      setTimeout(() => {
        onImageSelected(imageUrl);
        setIsUploading(false);
      }, 500);
    } catch (error) {
      console.error("Error processing image:", error);
      setIsUploading(false);
      alert("Failed to process image");
    }
  };

  /**
   * Trigger the file input click
   */
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleButtonClick}
        disabled={isUploading}
        className="flex items-center gap-1"
      >
        {isUploading ? (
          <span>Uploading...</span>
        ) : (
          <>
            <span>📷</span>
            <span>Image</span>
          </>
        )}
      </Button>
    </div>
  );
} 