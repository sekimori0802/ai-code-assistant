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

// デフォルトルームの作成
async function createDefaultRoom(db) {
  try {
    // デフォルトルームの存在確認
    const defaultRoom = await db.getAsync(
      'SELECT * FROM chat_rooms WHERE id = ?',
      ['00000000-0000-0000-0000-000000000000']
    );

    if (!defaultRoom) {
      // デフォルトルームを作成
      await db.runAsync(
        'INSERT INTO chat_rooms (id, name, created_by) VALUES (?, ?, ?)',
        ['00000000-0000-0000-0000-000000000000', 'General', 'system']
      );

      // デフォルトメッセージを追加
      const messageId = uuidv4();
      await db.runAsync(
        'INSERT INTO chat_room_messages (id, room_id, user_id, message) VALUES (?, ?, ?, ?)',
        [messageId, '00000000-0000-0000-0000-000000000000', 'system', 'ようこそGeneralチャットルームへ！']
      );

      // 既存のユーザーをデフォルトルームのメンバーとして追加
      const users = await db.allAsync('SELECT id FROM users', []);
      for (const user of users) {
        await db.runAsync(
          'INSERT OR IGNORE INTO chat_room_members (room_id, user_id) VALUES (?, ?)',
          ['00000000-0000-0000-0000-000000000000', user.id]
        );
      }

      console.log('デフォルトルームを作成しました');
    }
  } catch (error) {
    console.error('デフォルトルームの作成に失敗:', error);
    throw error;
  }
}

// データベース接続の初期化
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, async (err) => {
  if (err) {
    console.error('データベース接続エラー:', err.message);
  } else {
    console.log('データベースに接続しました');
    try {
      // WALモードを有効化
      await db.runAsync('PRAGMA journal_mode = WAL');
      // 外部キー制約を有効化
      await db.runAsync('PRAGMA foreign_keys = ON');
      // 同時実行制御を改善
      await db.runAsync('PRAGMA busy_timeout = 5000');
      // トランザクション分離レベルを設定
      await db.runAsync('PRAGMA read_uncommitted = 0');

      await initializeTables(db);
      await createDefaultAdmin(db);
      await createDefaultRoom(db);
      await db.logState();
      console.log('データベーステーブルの初期化が完了しました');
    } catch (error) {
      console.error('テーブルの初期化に失敗しました:', error);
    }
  }
});

// 接続プールの設定
db.configure('busyTimeout', 5000);

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
    db.serialize(async () => {
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
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // トークルームメンバーテーブル
      db.run(`
        CREATE TABLE IF NOT EXISTS chat_room_members (
          room_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (room_id, user_id),
          FOREIGN KEY (room_id) REFERENCES chat_rooms (id) ON DELETE CASCADE
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
          FOREIGN KEY (room_id) REFERENCES chat_rooms (id) ON DELETE CASCADE
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
      `);

      // データベースの初期化を完了
      resolve();
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

// トランザクション状態の管理
let transactionCount = 0;

// トランザクション用のPromiseラッパー
db.beginTransactionAsync = async function () {
  try {
    if (transactionCount === 0) {
      await this.runAsync('BEGIN IMMEDIATE TRANSACTION');
      console.log('トランザクションを開始しました');
    }
    transactionCount++;
  } catch (error) {
    console.error('トランザクション開始エラー:', error);
    throw error;
  }
};

db.commitAsync = async function () {
  try {
    if (transactionCount === 1) {
      await this.runAsync('COMMIT');
      console.log('トランザクションをコミットしました');
    }
    if (transactionCount > 0) {
      transactionCount--;
    }
  } catch (error) {
    console.error('トランザクションコミットエラー:', error);
    throw error;
  }
};

db.rollbackAsync = async function () {
  try {
    if (transactionCount > 0) {
      await this.runAsync('ROLLBACK');
      console.log('トランザクションをロールバックしました');
      transactionCount = 0;
    }
  } catch (error) {
    console.error('トランザクションロールバックエラー:', error);
    throw error;
  }
};

// データベース接続のクリーンアップ
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('データベース接続のクローズに失敗:', err);
    } else {
      console.log('データベース接続をクローズしました');
    }
    process.exit(0);
  });
});

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
