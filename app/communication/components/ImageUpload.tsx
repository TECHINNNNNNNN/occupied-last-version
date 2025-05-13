"use client";

/**
 * IMAGE UPLOAD COMPONENT
 * 
 * Provides functionality for uploading images to posts.
 * 
 * PURPOSE:
 * Enables users to enhance their posts with visual content by
 * uploading images directly to Supabase storage.
 * 
 * CONTEXT:
 * Part of the post creation form, allowing visual communication
 * alongside text content.
 * 
 * DATA FLOW:
 * - Receives callback for successful uploads from parent
 * - Handles file selection and validation internally
 * - Uploads directly to Supabase storage bucket
 * - Returns public URL to parent on success
 * 
 * KEY DEPENDENCIES:
 * - Supabase client for storage operations
 * - Browser File API for file handling
 * - UUID for generating unique filenames
 */

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

interface ImageUploadProps {
  onImageSelected: (imageUrl: string | null) => void;
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
   * Handle file selection and upload to Supabase storage
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File validation
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // 4MB max file size limit
    if (file.size > 4 * 1024 * 1024) {
      alert("File size should be less than 4MB");
      return;
    }

    setIsUploading(true);

    try {
      // Create a local preview first using FileReader
      const localPreviewUrl = URL.createObjectURL(file);
      
      // Immediately provide local preview to parent
      onImageSelected(localPreviewUrl);
      
      // Create a unique filename with original extension
      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      
      console.log("Attempting to upload image to Supabase storage bucket: communication-images");
      
      // Upload to Supabase storage
      const { error } = await supabase.storage
        .from('communication-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error("Supabase storage upload error:", error);
        throw error;
      }
      
      console.log("Supabase upload successful, getting public URL");
      
      // Get the public URL of the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('communication-images')
        .getPublicUrl(fileName);
      
      console.log("Generated public URL:", publicUrlData.publicUrl);
      
      // Update with the permanent URL after upload completes
      onImageSelected(publicUrlData.publicUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
      onImageSelected(null);
    } finally {
      setIsUploading(false);
      // Clear the file input for future uploads
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
        className="flex items-center justify-center h-full"
      >
        {isUploading ? (
          <span>📤</span>
        ) : (
          <span>📷</span>
        )}
      </Button>
    </div>
  );
} 