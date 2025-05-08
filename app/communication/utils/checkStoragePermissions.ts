/**
 * STORAGE PERMISSIONS CHECKER UTILITY
 * 
 * PURPOSE:
 * A diagnostic utility that tests Supabase storage bucket permissions
 * and helps identify common configuration issues.
 * 
 * CONTEXT:
 * Used when troubleshooting image upload or display issues to verify
 * that the storage bucket and its RLS policies are correctly configured.
 * 
 * DATA FLOW:
 * - Takes a Supabase client instance
 * - Performs multiple tests on storage buckets and permissions
 * - Returns diagnostic results and suggestions
 * 
 * KEY DEPENDENCIES:
 * - Supabase client for testing bucket access
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Represents the results of storage permission tests
 */
export interface StorageTestResults {
  bucketExists: boolean;
  canUpload: boolean;
  canRead: boolean;
  diagnosticDetails: string[];
  suggestions: string[];
}

/**
 * Run a comprehensive check of Supabase storage permissions
 * 
 * This function tests if:
 * 1. The specified bucket exists
 * 2. The current user can upload to the bucket
 * 3. Files in the bucket are publicly readable
 * 
 * @param supabase - An initialized Supabase client
 * @param bucketName - The name of the storage bucket to test
 * @returns A detailed results object with diagnostics and suggestions
 */
export async function checkStoragePermissions(
  supabase: SupabaseClient,
  bucketName: string = 'communication-images'
): Promise<StorageTestResults> {
  const results: StorageTestResults = {
    bucketExists: false,
    canUpload: false,
    canRead: false,
    diagnosticDetails: [],
    suggestions: []
  };
  
  try {
    // Step 1: Check if the bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      results.diagnosticDetails.push(`Error listing buckets: ${bucketsError.message}`);
      results.suggestions.push('Make sure your Supabase API keys are correct and have the necessary permissions.');
      return results;
    }
    
    if (!buckets) {
      results.diagnosticDetails.push('No buckets returned from Supabase.');
      results.suggestions.push('Verify your Supabase account is properly set up with storage enabled.');
      return results;
    }
    
    // Check if our bucket exists
    const bucket = buckets.find(b => b.name === bucketName);
    results.bucketExists = !!bucket;
    
    if (!results.bucketExists) {
      results.diagnosticDetails.push(`The "${bucketName}" bucket does not exist.`);
      results.suggestions.push(`Create a new bucket named "${bucketName}" in the Supabase dashboard.`);
      // Add SQL instructions for bucket creation
      results.suggestions.push(`
SQL to create bucket:
INSERT INTO storage.buckets (id, name, public)
VALUES ('${bucketName}', '${bucketName}', true);
      `);
      return results;
    }
    
    results.diagnosticDetails.push(`✓ The "${bucketName}" bucket exists.`);
    
    // Step 2: Check if we can upload to the bucket
    const testFileName = `permission-test-${Date.now()}.txt`;
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(testFileName, new Blob(['test']), { 
        contentType: 'text/plain',
        upsert: true
      });
    
    results.canUpload = !uploadError;
    
    if (uploadError) {
      results.diagnosticDetails.push(`Error uploading test file: ${uploadError.message}`);
      results.suggestions.push('Check your Row Level Security (RLS) policies for the bucket.');
      // Add SQL instructions for proper policies
      results.suggestions.push(`
SQL to fix upload permissions:
CREATE POLICY "Allow uploads for authenticated users" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = '${bucketName}');
      `);
    } else {
      results.diagnosticDetails.push('✓ Upload test passed. You can upload files to the bucket.');
      
      // Step 3: Check if we can read from the bucket
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(testFileName);
      
      if (!publicUrlData || !publicUrlData.publicUrl) {
        results.diagnosticDetails.push('Could not generate a public URL for the test file.');
        results.canRead = false;
      } else {
        try {
          // Test if the URL is accessible
          const response = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
          results.canRead = response.ok;
          
          if (results.canRead) {
            results.diagnosticDetails.push('✓ Public read test passed. The bucket is publicly readable.');
          } else {
            results.diagnosticDetails.push(`Public URL returned ${response.status} status code.`);
            results.suggestions.push('Check that the bucket is set to public or has proper read policies.');
            // Add SQL instructions for public read policy
            results.suggestions.push(`
SQL to fix read permissions:
CREATE POLICY "Allow public read access" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = '${bucketName}');
            `);
          }
        } catch (fetchError) {
          results.diagnosticDetails.push(`Error fetching public URL: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
          results.canRead = false;
          results.suggestions.push('There may be CORS issues or the URL is inaccessible.');
        }
      }
      
      // Clean up the test file
      await supabase.storage
        .from(bucketName)
        .remove([testFileName]);
    }
    
  } catch (error) {
    results.diagnosticDetails.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    results.suggestions.push('An unexpected error occurred. Check the console for more details.');
    console.error('Storage permission check error:', error);
  }
  
  // Add summary
  if (results.bucketExists && results.canUpload && results.canRead) {
    results.diagnosticDetails.unshift('✅ All storage permission tests passed!');
  } else {
    results.diagnosticDetails.unshift('❌ Some storage permission tests failed. See details below.');
  }
  
  return results;
}

/**
 * Print diagnostic results to the console in a formatted way
 * 
 * @param results - The results from checkStoragePermissions
 */
export function printStorageDiagnostics(results: StorageTestResults): void {
  console.group('Supabase Storage Permissions Diagnostic');
  
  console.log('%c Summary ', 'background: #666; color: white; font-weight: bold;');
  console.log(`Bucket exists: ${results.bucketExists ? '✅ Yes' : '❌ No'}`);
  console.log(`Can upload: ${results.canUpload ? '✅ Yes' : '❌ No'}`);
  console.log(`Can read: ${results.canRead ? '✅ Yes' : '❌ No'}`);
  
  console.log('%c Diagnostic Details ', 'background: #666; color: white; font-weight: bold;');
  results.diagnosticDetails.forEach(detail => console.log(detail));
  
  if (results.suggestions.length > 0) {
    console.log('%c Suggestions ', 'background: #666; color: white; font-weight: bold;');
    results.suggestions.forEach(suggestion => console.log(suggestion));
  }
  
  console.groupEnd();
} 