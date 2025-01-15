const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '../../data/database.sqlite');
const migrationSQL = fs.readFileSync(
  path.join(__dirname, 'add_llm_settings.sql'),
  'utf8'
);

const db = new sqlite3.Database(dbPath);

// マイグレーションの実行
db.serialize(() => {
  // トランザクション開始
  db.run('BEGIN TRANSACTION');

  try {
    // SQLの実行
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    statements.forEach(statement => {
      if (statement.trim()) {
        db.run(statement);
      }
    });

    // デフォルトのLLMモデルを追加
    const defaultModels = [
      {
        id: uuidv4(),
        model_name: 'gpt-3.5-turbo',
        api_key: process.env.OPENAI_API_KEY || '',
        base_url: 'https://api.openai.com/v1'
      },
      {
        id: uuidv4(),
        model_name: 'gpt-4',
        api_key: process.env.OPENAI_API_KEY || '',
        base_url: 'https://api.openai.com/v1'
      }
    ];

    const insertStmt = db.prepare(
      'INSERT INTO llm_settings (id, model_name, api_key, base_url) VALUES (?, ?, ?, ?)'
    );

    defaultModels.forEach(model => {
      insertStmt.run(model.id, model.model_name, model.api_key, model.base_url);
    });

    insertStmt.finalize();

    // トランザクションのコミット
    db.run('COMMIT');
    console.log('Migration completed successfully');
  } catch (error) {
    // エラー時はロールバック
    db.run('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    // データベース接続のクローズ
    db.close();
  }
});
