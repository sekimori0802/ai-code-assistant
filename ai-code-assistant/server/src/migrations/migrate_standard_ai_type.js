import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { db } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrateStandardAiType() {
    console.log('Adding standard AI type to chat_rooms table...');
    
    try {
        const sql = fs.readFileSync(
            path.join(__dirname, 'add_standard_ai_type.sql'),
            'utf8'
        );
        
        await db.exec(sql);
        console.log('Successfully added standard AI type');
        
    } catch (error) {
        console.error('Error adding standard AI type:', error);
        throw error;
    }
}

// マイグレーションの実行
migrateStandardAiType()
    .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
