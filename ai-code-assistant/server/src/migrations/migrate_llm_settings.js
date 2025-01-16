import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import db from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrateLLMSettings() {
  try {
    console.log('LLM設定のマイグレーションを開始します...');

    // SQLファイルを読み込む
    const sqlPath = path.join(__dirname, 'seed_llm_settings.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // トランザクションを開始
    await db.beginTransactionAsync();

    // 既存のデータを削除
    await db.runAsync('DELETE FROM llm_settings');

    // 新しいデータを挿入
    await db.runAsync(sql);

    // トランザクションをコミット
    await db.commitAsync();

    console.log('LLM設定のマイグレーションが完了しました');
  } catch (error) {
    // エラーが発生した場合はロールバック
    await db.rollbackAsync();
    console.error('LLM設定のマイグレーションに失敗:', error);
    throw error;
  }
}

migrateLLMSettings().catch(console.error);
