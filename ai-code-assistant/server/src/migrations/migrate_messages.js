const db = require('../config/database');

async function migrateMessages() {
  try {
    console.log('Starting migration...');
    await db.beginTransactionAsync();

    // デフォルトトークルームの作成
    const defaultRoomId = '00000000-0000-0000-0000-000000000000';
    console.log('Creating default room...');
    
    await db.runAsync(`
      INSERT INTO chat_rooms (id, name, created_by, created_at, updated_at)
      SELECT 
          ?,
          ?,
          ?,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
      WHERE NOT EXISTS (
          SELECT 1 FROM chat_rooms WHERE id = ?
      )
    `, [defaultRoomId, 'General', 'system', defaultRoomId]);

    // chat_logsからユーザーを取得
    console.log('Getting users from chat_logs...');
    const users = await db.allAsync('SELECT DISTINCT user_id FROM chat_logs');
    console.log(`Found ${users.length} users`);

    // 各ユーザーをメンバーとして追加
    for (const user of users) {
      await db.runAsync(`
        INSERT INTO chat_room_members (room_id, user_id, joined_at)
        SELECT 
            ?,
            ?,
            CURRENT_TIMESTAMP
        WHERE NOT EXISTS (
            SELECT 1 
            FROM chat_room_members 
            WHERE room_id = ? 
            AND user_id = ?
        )
      `, [defaultRoomId, user.user_id, defaultRoomId, user.user_id]);
    }

    // メッセージの移行
    console.log('Migrating messages...');
    const messages = await db.allAsync('SELECT * FROM chat_logs');
    console.log(`Found ${messages.length} messages to migrate`);

    for (const msg of messages) {
      await db.runAsync(`
        INSERT INTO chat_room_messages (id, room_id, user_id, message, created_at)
        SELECT 
            ?,
            ?,
            ?,
            ?,
            ?
        WHERE NOT EXISTS (
            SELECT 1 
            FROM chat_room_messages 
            WHERE id = ?
        )
      `, [msg.id, defaultRoomId, msg.user_id, msg.message, msg.timestamp, msg.id]);
    }

    await db.commitAsync();
    console.log('Migration completed successfully');
  } catch (error) {
    await db.rollbackAsync();
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
}

migrateMessages();
