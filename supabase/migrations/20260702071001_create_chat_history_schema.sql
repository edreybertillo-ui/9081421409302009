/*
# Chat History Schema

Stores chat sessions and messages for the Aqua chatbot.

1. chat_sessions - stores individual chat conversations
2. chat_messages - stores messages within each session

Each session has a title auto-generated from the conversation topic.
*/

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Chat',
  summary text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own chat sessions
DROP POLICY IF EXISTS "select_own_chat_sessions" ON chat_sessions;
CREATE POLICY "select_own_chat_sessions" ON chat_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chat_sessions" ON chat_sessions;
CREATE POLICY "insert_own_chat_sessions" ON chat_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_chat_sessions" ON chat_sessions;
CREATE POLICY "update_own_chat_sessions" ON chat_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chat_sessions" ON chat_sessions;
CREATE POLICY "delete_own_chat_sessions" ON chat_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  suggestions jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see messages from their own sessions
DROP POLICY IF EXISTS "select_own_chat_messages" ON chat_messages;
CREATE POLICY "select_own_chat_messages" ON chat_messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_chat_messages" ON chat_messages;
CREATE POLICY "insert_own_chat_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.user_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at ASC);