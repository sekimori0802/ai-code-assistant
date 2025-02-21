-- LLMモデル設定テーブル
CREATE TABLE IF NOT EXISTS llm_settings (
    id VARCHAR(36) PRIMARY KEY,
    api_key VARCHAR(255) NOT NULL,
    model VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初期データの挿入
INSERT INTO llm_settings (id, api_key, model) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'default-key', 'gpt-4o'),
('550e8400-e29b-41d4-a716-446655440001', 'default-key', 'gpt-4o-mini'),
('550e8400-e29b-41d4-a716-446655440002', 'default-key', 'claude-3-5-sonnet-20241022'),
('550e8400-e29b-41d4-a716-446655440003', 'default-key', 'gemini-pro');

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- システムユーザーの追加
INSERT INTO users (id, email, name, password_hash, is_admin) VALUES 
('system', 'system@example.com', 'System', 'system', 1);

-- チャットルームテーブル
CREATE TABLE IF NOT EXISTS chat_rooms (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    ai_type VARCHAR(50) DEFAULT 'standard',
    llm_model_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (llm_model_id) REFERENCES llm_settings(id)
);

-- チャットルームメンバーテーブル
CREATE TABLE IF NOT EXISTS chat_room_members (
    room_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- チャットメッセージテーブル
CREATE TABLE IF NOT EXISTS chat_room_messages (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_chat_room_messages_room_id ON chat_room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_messages_created_at ON chat_room_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_updated_at ON chat_rooms(updated_at);
