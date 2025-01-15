const db = require('../config/database');

async function migrateAiType() {
  try {
    await db.beginTransactionAsync();

    // AIタイプの列を追加
    await db.runAsync(`
      ALTER TABLE chat_rooms ADD COLUMN ai_type VARCHAR(50) DEFAULT 'code_generation'
    `);

    // 既存のチャットルームをコード生成AIタイプに更新
    await db.runAsync(`
      UPDATE chat_rooms SET ai_type = 'code_generation' WHERE ai_type IS NULL
    `);

    await db.commitAsync();
    console.log('マイグレーション成功: AIタイプの列を追加しました');
  } catch (error) {
    await db.rollbackAsync();
    console.error('マイグレーションエラー:', error);
  } finally {
    process.exit();
  }
}

migrateAiType();
