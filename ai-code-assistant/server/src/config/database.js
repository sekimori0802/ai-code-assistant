const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

// データベースファイルのパス
const dbPath = path.resolve(process.env.DB_PATH || 'database.sqlite');

// データベースディレクトリの作成
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// データベース接続の初期化
const db = new sqlite3.Database(dbPath, async (err) => {
  if (err) {
    console.error('データベース接続エラー:', err.message);
  } else {
    console.log('データベースに接続しました');
    try {
      await initializeTables(db);
      await createDefaultAdmin(db);
      await db.logState();
      console.log('データベーステーブルの初期化が完了しました');
    } catch (error) {
      console.error('テーブルの初期化に失敗しました:', error);
    }
  }
});

// デフォルト管理者ユーザーの作成
async function createDefaultAdmin(db) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 't.s.0514.0952@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // 管理者ユーザーの存在確認
    const existingAdmin = await db.getAsync(
      'SELECT * FROM users WHERE email = ?',
      [adminEmail]
    );

    if (!existingAdmin) {
      console.log('デフォルト管理者ユーザーを作成します');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      const adminId = uuidv4();

      await db.runAsync(
        'INSERT INTO users (id, email, password_hash, is_admin) VALUES (?, ?, ?, ?)',
        [adminId, adminEmail, hashedPassword, true]
      );

      console.log('デフォルト管理者ユーザーを作成しました:', {
        email: adminEmail,
        id: adminId
      });
    } else {
      console.log('管理者ユーザーは既に存在します:', {
        email: adminEmail,
        id: existingAdmin.id
      });
    }
  } catch (error) {
    console.error('デフォルト管理者ユーザーの作成に失敗:', error);
    throw error;
  }
}

// テーブルの初期化
async function initializeTables(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // ユーザーテーブル
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          is_admin BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // チャットログテーブル
      db.run(`
        CREATE TABLE IF NOT EXISTS chat_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          message TEXT NOT NULL,
          response TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // トークルームテーブル
      db.run(`
        CREATE TABLE IF NOT EXISTS chat_rooms (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // トークルームメンバーテーブル
      db.run(`
        CREATE TABLE IF NOT EXISTS chat_room_members (
          room_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (room_id, user_id),
          FOREIGN KEY (room_id) REFERENCES chat_rooms (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // トークルームメッセージテーブル
      db.run(`
        CREATE TABLE IF NOT EXISTS chat_room_messages (
          id TEXT PRIMARY KEY,
          room_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (room_id) REFERENCES chat_rooms (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // LLM設定テーブル
      db.run(`
        CREATE TABLE IF NOT EXISTS llm_settings (
          id TEXT PRIMARY KEY,
          api_key TEXT NOT NULL,
          model TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

// データベースのPromiseラッパー
db.runAsync = function (sql, params) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

db.getAsync = function (sql, params) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.allAsync = function (sql, params) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// トランザクション用のPromiseラッパー
db.beginTransactionAsync = function () {
  return new Promise((resolve, reject) => {
    this.run('BEGIN TRANSACTION', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

db.commitAsync = function () {
  return new Promise((resolve, reject) => {
    this.run('COMMIT', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

db.rollbackAsync = function () {
  return new Promise((resolve, reject) => {
    this.run('ROLLBACK', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// データベースの状態をログに出力
db.logState = async function () {
  try {
    const users = await this.allAsync('SELECT * FROM users', []);
    console.log('登録済みユーザー:', users.length);
    users.forEach(user => {
      console.log('- ユーザー:', {
        id: user.id,
        email: user.email,
        is_admin: user.is_admin
      });
    });
  } catch (error) {
    console.error('データベース状態の取得に失敗:', error);
  }
};

module.exports = db;
