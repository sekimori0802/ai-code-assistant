const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/database.sqlite');
const db = new sqlite3.Database(dbPath);

// テーブル構造の確認
db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='chat_rooms'", [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('chat_rooms table schema:');
  console.log(rows[0].sql);
  
  // llm_settingsテーブルも確認
  db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='llm_settings'", [], (err, rows) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    console.log('\nllm_settings table schema:');
    console.log(rows[0].sql);
    db.close();
  });
});
