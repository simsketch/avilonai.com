-- Migration: Add avatar profiles table for voice cloning and lip sync
-- Created: 2025-01-20

-- Avatar profiles table for storing user's voice clone and face image
CREATE TABLE IF NOT EXISTS avatar_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,

  -- Voice cloning (Fish Audio)
  voice_model_id TEXT,
  voice_name TEXT,
  voice_status TEXT, -- 'processing', 'ready', 'failed'
  voice_sample_url TEXT, -- Original audio sample URL

  -- Avatar image (for lip sync)
  avatar_image_url TEXT,
  avatar_thumbnail_url TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_avatar_profiles_user_id ON avatar_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_avatar_profiles_voice_model_id ON avatar_profiles(voice_model_id);

-- Trigger for updated_at
CREATE TRIGGER update_avatar_profiles_updated_at BEFORE UPDATE ON avatar_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add session_mode column to chat_sessions for tracking avatar vs text mode
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS session_mode TEXT DEFAULT 'text';

-- Comment: Run this migration with:
-- psql -d your_database -f migrations/add_avatar_profiles.sql
-- Or apply via Supabase dashboard SQL editor
