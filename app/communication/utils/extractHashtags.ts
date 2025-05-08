/**
 * HASHTAG EXTRACTION UTILITY
 * 
 * This utility function extracts hashtags from text content.
 * Hashtags are identified as words starting with # followed by alphanumeric characters.
 * 
 * @param text - The text content to extract hashtags from
 * @returns An array of unique hashtags found in the text
 */
export function extractHashtags(text: string): string[] {
  // Regular expression to match hashtags (word starting with # followed by letters/numbers)
  const regex = /#(\w+)/g;
  const matches = text.match(regex) || [];

  // Return unique hashtags
  return [...new Set(matches)];
} 