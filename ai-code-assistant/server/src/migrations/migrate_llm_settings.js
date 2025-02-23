const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '../../data/database.sqlite');
const migrationSQL = fs.readFileSync(
  path.join(__dirname, 'add_llm_settings.sql'),
  'utf8'
);

const db = new sqlite3.Database(dbPath);

// Promiseラッパー関数
const runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

// マイグレーションの実行
async function migrate() {
  try {
    // トランザクション開始
    await runAsync('BEGIN TRANSACTION');

    // SQLの実行
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await runAsync(statement);
      }
    }

    // トランザクションのコミット
    await runAsync('COMMIT');
    console.log('Migration completed successfully');
  } catch (error) {
    // エラー時はロールバック
    await runAsync('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // データベース接続のクローズ
    db.close();
  }
}

// マイグレーションの実行
migrate().catch(console.error);
