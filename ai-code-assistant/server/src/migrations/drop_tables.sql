-- 外部キー制約があるテーブルから順に削除
DROP TABLE IF EXISTS chat_room_messages;
DROP TABLE IF EXISTS chat_room_members;
DROP TABLE IF EXISTS chat_rooms;
DROP TABLE IF EXISTS llm_settings;
DROP TABLE IF EXISTS users;
