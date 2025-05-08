# Library Communication Platform

This module provides a Twitter/Instagram-style platform for students to share real-time updates about library conditions, availability, events, and resources.

## Features

- Create posts with text, images, zone tags, and automatic hashtag detection
- Like and reply to posts
- Auto-expiring posts (1-24 hours) to keep information fresh
- Real-time updates via Supabase subscriptions
- Filter posts by zone or topic
- Modern, responsive UI

## Supabase Setup

### 1. Run Database Migrations

Execute the following SQL migration scripts in your Supabase SQL Editor:

1. `supabase/migrations/20230601000000_create_communications_tables.sql` - Creates the tables and RLS policies
2. `supabase/migrations/20230601000001_create_cleanup_schedule.sql` - Sets up scheduled cleanup of expired posts
3. `supabase/migrations/20230601000002_insert_demo_data.sql` - Inserts demo data for testing (optional)

### 2. Set Up Storage Bucket

1. Create a new storage bucket called `communication-images`
2. Set up the following RLS policies:
   - Allow authenticated users to upload to this bucket
   - Make the bucket publicly readable for everyone

```sql
-- Example RLS policy for storage bucket
CREATE POLICY "Allow uploads for authenticated users" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'communication-images');

CREATE POLICY "Allow public read access" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'communication-images');
```

### 3. Deploy Edge Functions

1. Deploy the expired posts cleanup function:

```bash
supabase functions deploy cleanup-expired-posts
```

2. Set up the scheduled function to run every 15 minutes:

```bash
supabase functions deploy _scheduled/expired-posts-cleanup
```

3. Check that the function is correctly scheduled in the Supabase dashboard

## Environment Variables

Make sure your `.env.local` file includes:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Component Usage

The main entry point is `CommunicationFeed` which should be used in your page:

```tsx
// app/communication/page.tsx
import CommunicationFeed from "./components/CommunicationFeed";

export default function CommunicationPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Library Updates</h1>
      <CommunicationFeed />
    </div>
  );
}
```

## Data Types

The communication feature uses these main data types:

- `Post`: Main post content with metadata
- `Reply`: Comments on posts
- `Zone`: Library location tags
- `Topic`: Content categories (hashtags)
- `User`: Profile information

See `app/communication/types/communicationTypes.ts` for complete type definitions.

## Supabase Schema

The feature relies on these database tables:

- `communications`: Main posts table
- `communication_replies`: Post replies/comments
- `communication_reactions`: Post likes
- `communication_post_topics`: Many-to-many relationship between posts and topics
- `communication_topics`: Hashtag categories
- `library_zones`: Library locations that can be tagged

## Testing

To test with mock data, you can:

1. Run the demo data migration script
2. Use the application with test user accounts
3. Verify real-time updates work by opening the app in multiple tabs
