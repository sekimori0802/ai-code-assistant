-- 既存のAIタイプの制約を削除
DROP TABLE IF EXISTS chat_rooms_temp;
CREATE TABLE chat_rooms_temp AS SELECT * FROM chat_rooms;
DROP TABLE chat_rooms;

-- テーブルを再作成（一時テーブルから全データをコピー）
CREATE TABLE chat_rooms AS SELECT * FROM chat_rooms_temp;

-- 新しい制約を追加（standardタイプを含む）
ALTER TABLE chat_rooms ADD CONSTRAINT check_ai_type CHECK (
    ai_type IN (
        'standard',
        'code_generation',
        'blog_writing',
        'english_conversation',
        'video_editing',
        'pc_productivity'
    )
);

-- 一時テーブルを削除
DROP TABLE chat_rooms_temp;
