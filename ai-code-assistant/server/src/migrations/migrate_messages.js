const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function runMigration() {
  try {
    console.log('マイグレーションを開始します...');

    // テーブル作成SQLの読み込みと実行
    const createTablesSql = fs.readFileSync(
      path.join(__dirname, 'create_tables.sql'),
      'utf8'
    );
    console.log('テーブルを作成します...');

    // SQLステートメントを分割して実行
    const createStatements = createTablesSql
      .split(';')
      .filter(stmt => stmt.trim())
      .map(stmt => stmt.trim() + ';');

    for (const statement of createStatements) {
      await db.runAsync(statement);
    }
    console.log('テーブルの作成が完了しました');

    // データ移行SQLの読み込みと実行
    const migrateSql = fs.readFileSync(
      path.join(__dirname, 'migrate_messages.sql'),
      'utf8'
    );
    console.log('データを移行します...');

    // SQLステートメントを分割して実行
    const migrateStatements = migrateSql
      .split(';')
      .filter(stmt => stmt.trim())
      .map(stmt => stmt.trim() + ';');

    for (const statement of migrateStatements) {
      await db.runAsync(statement);
    }
    console.log('データの移行が完了しました');

    console.log('マイグレーションが正常に完了しました');
  } catch (error) {
    console.error('マイグレーションエラー:', error);
    throw error;
  }
}

// マイグレーションの実行
runMigration().catch(error => {
  console.error('マイグレーション失敗:', error);
  process.exit(1);
});
