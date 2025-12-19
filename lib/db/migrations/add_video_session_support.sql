-- Add video session support to chat_sessions table
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS is_video_session BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS conversation_id TEXT,
ADD COLUMN IF NOT EXISTS conversation_url TEXT;

-- Create index for video sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_is_video ON chat_sessions(is_video_session);
