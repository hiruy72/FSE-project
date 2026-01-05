const { query } = require('../config/database');

/**
 * Recalculate and update statistics for a specific mentor
 * @param {string} mentorId - The mentor's UUID
 * @returns {Object} Updated statistics
 */
const updateMentorStatistics = async (mentorId) => {
  try {
    // Get total students helped (unique mentees from completed sessions only)
    const studentsHelpedResult = await query(
      'SELECT COUNT(DISTINCT mentee_id) as students_helped FROM sessions WHERE mentor_id = $1 AND status = $2',
      [mentorId, 'completed']
    );
    const studentsHelped = parseInt(studentsHelpedResult[0].students_helped) || 0;

    // Get total minutes from completed sessions
    const totalMinutesResult = await query(
      'SELECT COALESCE(SUM(duration), 0) as total_minutes FROM logs WHERE mentor_id = $1',
      [mentorId]
    );
    const totalMinutes = parseInt(totalMinutesResult[0].total_minutes) || 0;

    // Get rating statistics
    const ratingsResult = await query(
      'SELECT rating FROM ratings WHERE mentor_id = $1',
      [mentorId]
    );

    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;
    let totalRatings = ratingsResult.length;
    
    ratingsResult.forEach(row => {
      const rating = row.rating;
      ratingCounts[rating]++;
      totalRating += rating;
    });

    const averageRating = totalRatings > 0 ? parseFloat((totalRating / totalRatings).toFixed(1)) : 0;

    // Get current profile and update with new statistics
    const currentProfileResult = await query(
      'SELECT profile FROM users WHERE id = $1',
      [mentorId]
    );
    
    const currentProfile = currentProfileResult[0]?.profile || {};
    const updatedProfile = {
      ...currentProfile,
      studentsHelped,
      totalMinutes,
      averageRating,
      totalRatings,
      ratingDistribution: ratingCounts,
      lastUpdated: new Date().toISOString()
    };

    await query(`
      UPDATE users 
      SET profile = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [
      JSON.stringify(updatedProfile),
      mentorId
    ]);

    return {
      studentsHelped,
      totalMinutes,
      averageRating,
      totalRatings,
      ratingDistribution: ratingCounts
    };
  } catch (error) {
    console.error(`Error updating mentor ${mentorId} statistics:`, error);
    throw error;
  }
};

/**
 * Recalculate statistics for all mentors
 * @returns {Array} Array of updated mentor statistics
 */
const updateAllMentorStatistics = async () => {
  try {
    // Get all mentors
    const mentorsResult = await query(
      'SELECT id, first_name, last_name FROM users WHERE role = $1 AND approved = true',
      ['mentor']
    );

    const results = [];
    
    for (const mentor of mentorsResult) {
      try {
        const stats = await updateMentorStatistics(mentor.id);
        results.push({
          mentorId: mentor.id,
          mentorName: `${mentor.first_name} ${mentor.last_name}`,
          ...stats,
          success: true
        });
        console.log(`✅ Updated statistics for mentor: ${mentor.first_name} ${mentor.last_name}`);
      } catch (error) {
        console.error(`❌ Failed to update statistics for mentor: ${mentor.first_name} ${mentor.last_name}`, error);
        results.push({
          mentorId: mentor.id,
          mentorName: `${mentor.first_name} ${mentor.last_name}`,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error updating all mentor statistics:', error);
    throw error;
  }
};

/**
 * Get mentor statistics without updating
 * @param {string} mentorId - The mentor's UUID
 * @returns {Object} Current statistics
 */
const getMentorStatistics = async (mentorId) => {
  try {
    // Get students helped count
    const studentsHelpedResult = await query(
      'SELECT COUNT(DISTINCT mentee_id) as students_helped FROM sessions WHERE mentor_id = $1 AND status = $2',
      [mentorId, 'completed']
    );
    const studentsHelped = parseInt(studentsHelpedResult[0].students_helped) || 0;

    // Get total minutes
    const totalMinutesResult = await query(
      'SELECT COALESCE(SUM(duration), 0) as total_minutes FROM logs WHERE mentor_id = $1',
      [mentorId]
    );
    const totalMinutes = parseInt(totalMinutesResult[0].total_minutes) || 0;

    // Get rating statistics
    const ratingsResult = await query(
      'SELECT rating FROM ratings WHERE mentor_id = $1',
      [mentorId]
    );

    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;
    let totalRatings = ratingsResult.length;
    
    ratingsResult.forEach(row => {
      const rating = row.rating;
      ratingCounts[rating]++;
      totalRating += rating;
    });

    const averageRating = totalRatings > 0 ? parseFloat((totalRating / totalRatings).toFixed(1)) : 0;

    return {
      studentsHelped,
      totalMinutes,
      averageRating,
      totalRatings,
      ratingDistribution: ratingCounts
    };
  } catch (error) {
    console.error(`Error getting mentor ${mentorId} statistics:`, error);
    throw error;
  }
};

module.exports = {
  updateMentorStatistics,
  updateAllMentorStatistics,
  getMentorStatistics
};