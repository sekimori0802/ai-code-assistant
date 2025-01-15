-- 一時テーブルの作成
CREATE TABLE users_temp (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT '',
    is_admin BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- データの移行
INSERT INTO users_temp SELECT 
    id,
    email,
    password_hash,
    CASE 
        WHEN id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1) THEN 'sasao1'
        WHEN id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1 OFFSET 1) THEN 'sasao2'
        WHEN id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1 OFFSET 2) THEN 'sasao3'
        ELSE 'AI'
    END as name,
    is_admin,
    created_at,
    updated_at
FROM users;

-- 古いテーブルの削除
DROP TABLE users;

-- 新しいテーブルの名前を変更
ALTER TABLE users_temp RENAME TO users;
