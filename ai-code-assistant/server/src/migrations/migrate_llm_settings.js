import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import db from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrateLLMSettings() {
  try {
    console.log('LLM設定のマイグレーションを開始します...');

    // .envファイルの読み込み
    const envPath = path.join(__dirname, '../../.env');
    let apiKey = 'default-key';
    
    if (fs.existsSync(envPath)) {
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      apiKey = envConfig.OPENAI_API_KEY || 'default-key';
    }

    // トランザクションを開始
    await db.beginTransactionAsync();

    // 既存のデータを削除
    await db.runAsync('DELETE FROM llm_settings');

    // 新しいデータを挿入
    await db.runAsync(`
      INSERT INTO llm_settings (id, api_key, model) VALUES 
      ('550e8400-e29b-41d4-a716-446655440000', ?, 'gpt-4o'),
      ('550e8400-e29b-41d4-a716-446655440001', ?, 'gpt-4o-mini'),
      ('550e8400-e29b-41d4-a716-446655440002', ?, 'claude-3-5-sonnet-20241022'),
      ('550e8400-e29b-41d4-a716-446655440003', ?, 'gemini-pro')
    `, [apiKey, apiKey, apiKey, apiKey]);

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
