const { updateAllMentorStatistics } = require('./backend/src/utils/mentorStats');

async function runMigration() {
  try {
    console.log('🔄 Starting mentor statistics migration...\n');
    
    const results = await updateAllMentorStatistics();
    
    console.log('\n📊 Migration Results:');
    console.log(`Total mentors processed: ${results.length}`);
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Successful updates: ${successful.length}`);
    console.log(`❌ Failed updates: ${failed.length}\n`);
    
    if (successful.length > 0) {
      console.log('✅ Successfully Updated Mentors:');
      successful.forEach(result => {
        console.log(`   • ${result.mentorName}:`);
        console.log(`     - Students Helped: ${result.studentsHelped}`);
        console.log(`     - Total Minutes: ${result.totalMinutes}`);
        console.log(`     - Average Rating: ${result.averageRating}/5`);
        console.log(`     - Total Ratings: ${result.totalRatings}`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ Failed Updates:');
      failed.forEach(result => {
        console.log(`   • ${result.mentorName}: ${result.error}`);
      });
    }
    
    console.log('\n🎉 Migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };