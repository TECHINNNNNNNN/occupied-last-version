-- Insert demo data for the library communication platform
-- This is for demonstration purposes and will create initial data
-- for zones, topics, and some sample communications

-- Insert library zones
INSERT INTO library_zones (id, name, capacity, floor, description)
VALUES
  ('39d0dfcc-d7b5-4e7c-a562-90b6461b9c34', 'Quiet Study Area', 50, 2, 'Silent individual study zone with personal desks'),
  ('bf3d2707-f9ea-45e4-a092-53743d642a27', 'Group Study Rooms', 30, 3, 'Collaborative spaces for team projects'),
  ('ce43db6b-7a15-4d0b-b58c-968b5ca0daac', 'Computer Lab', 40, 1, 'Computing facilities with engineering software'),
  ('7edc55e9-316f-43b7-b9f4-ebf5277e608b', 'Media Center', 25, 1, 'Multimedia resources and viewing stations'),
  ('8a5f52bd-668a-47e6-8375-415c9ebb3d76', 'Main Reading Hall', 100, 2, 'Central reading space with reference materials');

-- Insert some initial topics
INSERT INTO communication_topics (id, name)
VALUES
  ('6f1b1737-6aaf-4347-90f0-4bb20a77526c', 'noise'),
  ('c1b53d5c-6f0c-4b7e-9ea6-88b0a34b6ea9', 'availability'),
  ('98547c30-bd81-4a8d-a85b-4a7fbf7f36bb', 'resources'),
  ('7b51ed54-0b20-4c3a-8c19-6047a66f3d83', 'events'),
  ('f0cb5f39-912a-4486-8d96-216f905f7a1d', 'help');

-- Function to create sample communications
-- (Requires auth.users to exist with some user accounts)
DO $$
DECLARE
  user_id uuid;
  sample_users uuid[] := ARRAY(SELECT id FROM auth.users LIMIT 5);
  zone_ids uuid[] := ARRAY(SELECT id FROM library_zones);
  topic_ids uuid[] := ARRAY(SELECT id FROM communication_topics);
  demo_post_id uuid;
BEGIN
  -- Only proceed if we have sample users
  IF array_length(sample_users, 1) > 0 THEN
    -- Create sample posts for each user
    FOREACH user_id IN ARRAY sample_users
    LOOP
      -- Create post 1 - with zone, no image
      demo_post_id := uuid_generate_v4();
      INSERT INTO communications 
        (id, user_id, content, zone_id, expires_at, created_at)
      VALUES
        (
          demo_post_id,
          user_id,
          'The #availability in the quiet study area is good right now. About 15 open spaces if anyone needs a spot! #study',
          zone_ids[1],
          NOW() + interval '3 hours',
          NOW() - interval '30 minutes'
        );
        
      -- Link this post to topics (hashtags)
      INSERT INTO communication_post_topics (post_id, topic_id)
      VALUES 
        (demo_post_id, topic_ids[2]); -- availability topic
        
      -- Create post 2 - with image, no zone
      demo_post_id := uuid_generate_v4();
      INSERT INTO communications 
        (id, user_id, content, image_url, expires_at, created_at)
      VALUES
        (
          demo_post_id,
          user_id,
          'Just noticed the library has new #resources for circuit design. Has anyone used these yet? #engineering',
          'https://example.com/images/circuits.jpg',
          NOW() + interval '6 hours',
          NOW() - interval '2 hours'
        );
        
      -- Link this post to topics (hashtags)
      INSERT INTO communication_post_topics (post_id, topic_id)
      VALUES 
        (demo_post_id, topic_ids[3]); -- resources topic
    END LOOP;
    
    -- Create some replies to the first post
    IF EXISTS (SELECT 1 FROM communications LIMIT 1) THEN
      demo_post_id := (SELECT id FROM communications ORDER BY created_at DESC LIMIT 1);
      
      INSERT INTO communication_replies 
        (id, post_id, user_id, content, created_at)
      VALUES
        (
          uuid_generate_v4(),
          demo_post_id,
          sample_users[array_length(sample_users, 1)], -- last user
          'Thanks for the update! Heading there now.',
          NOW() - interval '15 minutes'
        ),
        (
          uuid_generate_v4(),
          demo_post_id,
          sample_users[1], -- first user 
          'Are the standing desks available too?',
          NOW() - interval '10 minutes'
        );
    END IF;
  END IF;
END
$$; 