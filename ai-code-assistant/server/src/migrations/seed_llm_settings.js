const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '../../data/database.sqlite');
const seedSQL = fs.readFileSync(
  path.join(__dirname, 'seed_llm_settings.sql'),
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

// シードデータの投入
async function seed() {
  try {
    // トランザクション開始
    await runAsync('BEGIN TRANSACTION');

    // 既存のデータを削除
    await runAsync('DELETE FROM llm_settings');

    // SQLの実行
    const statements = seedSQL.split(';').filter(stmt => stmt.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await runAsync(statement);
      }
    }

    // トランザクションのコミット
    await runAsync('COMMIT');
    console.log('Seed data inserted successfully');
  } catch (error) {
    // エラー時はロールバック
    await runAsync('ROLLBACK');
    console.error('Seed failed:', error);
    throw error;
  } finally {
    // データベース接続のクローズ
    db.close();
  }
}

// シードの実行
seed().catch(console.error);
