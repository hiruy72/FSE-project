const { query } = require('./backend/src/config/database');

async function migrateMandatoryRating() {
  try {
    console.log('🔄 Starting mandatory rating migration...\n');
    
    // Drop existing constraint
    console.log('1. Dropping existing status constraint...');
    await query(`
      ALTER TABLE sessions 
      DROP CONSTRAINT IF EXISTS sessions_status_check
    `);
    console.log('   ✅ Constraint dropped');
    
    // Add new constraint with pending_rating status
    console.log('2. Adding new status constraint with pending_rating...');
    await query(`
      ALTER TABLE sessions 
      ADD CONSTRAINT sessions_status_check 
      CHECK (status IN ('requested', 'active', 'completed', 'cancelled', 'pending_rating'))
    `);
    console.log('   ✅ New constraint added');
    
    // Check for any existing sessions that might need updating
    console.log('3. Checking existing sessions...');
    const existingSessions = await query(`
      SELECT COUNT(*) as count, status 
      FROM sessions 
      GROUP BY status
    `);
    
    console.log('   Current session status distribution:');
    existingSessions.forEach(row => {
      console.log(`   - ${row.status}: ${row.count} sessions`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Test session ending as a mentee');
    console.log('   3. Verify rating modal appears and is mandatory');
    console.log('   4. Confirm session completes after rating');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    
    console.log('\n🔧 Manual Migration Steps:');
    console.log('Run these SQL commands manually:');
    console.log('');
    console.log('ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check;');
    console.log('ALTER TABLE sessions ADD CONSTRAINT sessions_status_check');
    console.log('  CHECK (status IN (\'requested\', \'active\', \'completed\', \'cancelled\', \'pending_rating\'));');
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  migrateMandatoryRating();
}

module.exports = { migrateMandatoryRating };