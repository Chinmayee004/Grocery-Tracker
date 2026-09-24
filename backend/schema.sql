-- ==============================================================================
-- SHARED GROCERY LIST - SUPABASE POSTGRESQL SCHEMA MIGRATION
-- ==============================================================================
-- Run this entire script inside your Supabase project's SQL Editor:
-- Dashboard -> Project -> SQL Editor -> New Query -> Paste & Run.
-- ==============================================================================

-- 1. Enable UUID generator extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create grocery_items table
-- Note: 'users' table is natively provisioned and managed by Supabase in the 'auth' schema (auth.users).
-- 'user_id' establishes a strict foreign key relationship with auth.users(id).
CREATE TABLE IF NOT EXISTS public.grocery_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Performance Indexes
-- Index for fetching a specific user's grocery list ordered by creation date
CREATE INDEX IF NOT EXISTS idx_grocery_items_user_id_created_at
    ON public.grocery_items (user_id, created_at DESC);

-- Index for filtering by completion status
CREATE INDEX IF NOT EXISTS idx_grocery_items_user_id_completed
    ON public.grocery_items (user_id, is_completed);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies
-- Policy: Allow users to view only their own grocery items
CREATE POLICY "Users can read own grocery items"
    ON public.grocery_items
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Allow users to insert their own grocery items
CREATE POLICY "Users can insert own grocery items"
    ON public.grocery_items
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to update their own grocery items (e.g. toggle is_completed, update name)
CREATE POLICY "Users can update own grocery items"
    ON public.grocery_items
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to delete their own grocery items
CREATE POLICY "Users can delete own grocery items"
    ON public.grocery_items
    FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Realtime Replication setup (Optional, for Supabase Realtime channel fallback)
-- Ensures update payloads contain previous column states if replica identity is queried
ALTER TABLE public.grocery_items REPLICA IDENTITY FULL;

-- ==============================================================================
-- Verification Query
-- ==============================================================================
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'grocery_items';
