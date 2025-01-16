const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function checkData() {
  try {
    const db = await open({
      filename: path.join(__dirname, '../../data/database.sqlite'),
      driver: sqlite3.Database
    });

    console.log('LLM Settings:');
    const llmSettings = await db.all('SELECT * FROM llm_settings');
    console.log(llmSettings);

    console.log('\nChat Rooms:');
    const chatRooms = await db.all('SELECT * FROM chat_rooms');
    console.log(chatRooms);

    await db.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkData();
