-- LLMの設定テーブル
CREATE TABLE IF NOT EXISTS llm_settings (
    id VARCHAR(36) PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    api_key TEXT NOT NULL,
    base_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- チャットルームテーブルにLLMモデルの参照を追加
ALTER TABLE chat_rooms ADD COLUMN llm_model_id VARCHAR(36) REFERENCES llm_settings(id);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_chat_rooms_llm_model_id ON chat_rooms(llm_model_id);
