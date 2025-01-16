const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function migrateLLMSettings() {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'update_claude_model.sql'),
      'utf8'
    );

    await db.runAsync(sql);
    console.log('✅ Claudeモデル名の更新が完了しました');
  } catch (error) {
    console.error('❌ Claudeモデル名の更新に失敗しました:', error);
    throw error;
  }
}

migrateLLMSettings().catch(console.error);
