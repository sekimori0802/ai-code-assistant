-- AIタイプの列を追加
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS ai_type VARCHAR(50) DEFAULT 'code_generation';

-- 既存のチャットルームをコード生成AIタイプに更新
UPDATE chat_rooms SET ai_type = 'code_generation' WHERE ai_type IS NULL;

-- AIタイプの制約を追加
ALTER TABLE chat_rooms ADD CONSTRAINT check_ai_type CHECK (
    ai_type IN (
        'code_generation',
        'blog_writing',
        'english_conversation',
        'video_editing',
        'pc_productivity'
    )
);
