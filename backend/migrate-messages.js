require('dotenv').config();
const { query, initializeDatabase } = require('./src/config/database');

async function migrateDatabase() {
  try {
    console.log('Initializing database connection...');
    await initializeDatabase();
    
    console.log('Starting database migration...');
    
    // Add new columns to messages table
    await query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text'
    `);
    
    await query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS file_url TEXT
    `);
    
    await query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS file_name TEXT
    `);
    
    await query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS file_size INTEGER
    `);
    
    await query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS file_type TEXT
    `);
    
    // Add check constraint for message_type
    try {
      await query(`
        ALTER TABLE messages 
        ADD CONSTRAINT messages_message_type_check 
        CHECK (message_type IN ('text', 'image', 'file'))
      `);
    } catch (error) {
      console.log('Note: Check constraint may already exist');
    }
    
    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateDatabase();