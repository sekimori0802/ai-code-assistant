const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function migrateAddName() {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'add_name_to_users.sql'),
      'utf8'
    );

    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    for (const statement of statements) {
      await db.runAsync(statement);
    }

    console.log('✅ nameカラムの追加が完了しました');
  } catch (error) {
    console.error('❌ マイグレーションエラー:', error);
    throw error;
  }
}

// スクリプトが直接実行された場合のみマイグレーションを実行
if (require.main === module) {
  migrateAddName().catch(console.error);
}

module.exports = migrateAddName;
