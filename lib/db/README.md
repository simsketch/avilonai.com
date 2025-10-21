# Database Setup

This directory contains the database schema and utilities for the Avilon therapy bot.

## Setup Instructions

1. Create a Supabase project at https://supabase.com
2. Navigate to the SQL Editor in your Supabase dashboard
3. Copy the contents of `schema.sql` and execute it in the SQL Editor
4. Add your Supabase credentials to `.env`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Tables

- **patient_profiles**: Stores user intake data and patient information
- **chat_sessions**: Tracks therapy sessions with mood scores
- **messages**: Stores chat messages with optional embeddings
- **crisis_logs**: Records crisis detection incidents
- **session_notes**: Persists therapy session summaries

## Extensions

- **pgvector**: Enables vector similarity search for semantic message retrieval
