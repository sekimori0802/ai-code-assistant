-- デフォルトトークルームの作成
INSERT INTO chat_rooms (id, name, created_by, created_at, updated_at)
SELECT 
    '00000000-0000-0000-0000-000000000000',
    'General',
    'system',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM chat_rooms WHERE id = '00000000-0000-0000-0000-000000000000'
);

-- chat_logsからユーザーをメンバーとして追加
INSERT INTO chat_room_members (room_id, user_id, joined_at)
SELECT DISTINCT
    '00000000-0000-0000-0000-000000000000',
    user_id,
    CURRENT_TIMESTAMP
FROM chat_logs
WHERE NOT EXISTS (
    SELECT 1 
    FROM chat_room_members 
    WHERE room_id = '00000000-0000-0000-0000-000000000000' 
    AND user_id = chat_logs.user_id
);

-- chat_logsのメッセージをchat_room_messagesに移行
INSERT INTO chat_room_messages (id, room_id, user_id, message, created_at)
SELECT 
    id,
    '00000000-0000-0000-0000-000000000000',
    user_id,
    message,
    timestamp
FROM chat_logs
WHERE NOT EXISTS (
    SELECT 1 
    FROM chat_room_messages 
    WHERE id = chat_logs.id
);
