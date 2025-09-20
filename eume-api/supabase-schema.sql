-- 사용자 테이블
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 대화 메시지 테이블
CREATE TABLE conversation_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  INDEX idx_conversation_messages_user_id (user_id),
  INDEX idx_conversation_messages_timestamp (timestamp)
);

-- 사진 세션 테이블
CREATE TABLE photo_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  image_analysis TEXT,
  is_active BOOLEAN DEFAULT true,
  start_time BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  INDEX idx_photo_sessions_user_id (user_id),
  INDEX idx_photo_sessions_active (is_active)
);

-- 대화 세션 테이블 (보고서 생성용)
CREATE TABLE conversation_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  session_start BIGINT NOT NULL,
  session_end BIGINT,
  total_duration BIGINT,
  total_conversations INTEGER DEFAULT 0,
  photo_session_id UUID REFERENCES photo_sessions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  INDEX idx_conversation_sessions_user_id (user_id),
  INDEX idx_conversation_sessions_start (session_start)
);

-- Row Level Security 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

-- 정책 설정 (모든 작업 허용 - 서비스 키 사용)
CREATE POLICY "Allow all operations" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON conversation_messages FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON photo_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON conversation_sessions FOR ALL USING (true);