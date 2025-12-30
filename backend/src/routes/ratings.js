const express = require('express');
const { db } = require('../config/firebase');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// Helper function to update mentor rating stats
const updateMentorRatingStats = async (mentorId) => {
  try {
    const ratingsSnapshot = await db.collection('ratings')
      .where('mentorId', '==', mentorId)
      .get();

    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;
    let totalRatings = 0;

    ratingsSnapshot.forEach(doc => {
      const rating = doc.data().rating;
      ratingCounts[rating]++;
      totalRating += rating;
      totalRatings++;
    });

    const averageRating = totalRatings > 0 ? parseFloat((totalRating / totalRatings).toFixed(1)) : 0;

    // Update mentor's profile with new stats
    await db.collection('users').doc(mentorId).update({
      'profile.averageRating': averageRating,
      'profile.totalRatings': totalRatings,
      'profile.ratingDistribution': ratingCounts,
      updatedAt: new Date()
    });

    return { averageRating, totalRatings, ratingDistribution: ratingCounts };
  } catch (error) {
    console.error('Error updating mentor rating stats:', error);
    throw error;
  }
};

// Submit a rating
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { sessionId, mentorId, rating, feedback } = req.body;

    // Verify session exists and user was the mentee
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessionDoc.data();
    
    if (sessionData.menteeId !== req.user.uid) {
      return res.status(403).json({ error: 'Only mentees can rate sessions' });
    }

    if (sessionData.status !== 'completed') {
      return res.status(400).json({ error: 'Session must be completed to rate' });
    }

    if (sessionData.mentorId !== mentorId) {
      return res.status(400).json({ error: 'Mentor ID does not match session' });
    }

    // Check if rating already exists
    const existingRatingQuery = await db.collection('ratings')
      .where('sessionId', '==', sessionId)
      .where('menteeId', '==', req.user.uid)
      .get();

    if (!existingRatingQuery.empty) {
      return res.status(400).json({ error: 'Rating already submitted for this session' });
    }

    const ratingData = {
      sessionId,
      menteeId: req.user.uid,
      mentorId,
      rating: Math.max(1, Math.min(5, parseInt(rating))), // Ensure rating is between 1-5
      feedback: feedback || '',
      createdAt: new Date()
    };

    const docRef = await db.collection('ratings').add(ratingData);

    // Auto-update mentor's average rating and stats
    const updatedStats = await updateMentorRatingStats(mentorId);

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('mentor-rating-updated', {
        mentorId,
        newRating: updatedStats.averageRating,
        totalRatings: updatedStats.totalRatings,
        ratingDistribution: updatedStats.ratingDistribution
      });
    }

    res.status(201).json({
      message: 'Rating submitted successfully',
      rating: {
        id: docRef.id,
        ...ratingData
      }
    });
  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json({
      error: 'Failed to submit rating',
      message: error.message
    });
  }
});

// Get ratings for a mentor
router.get('/:mentorId', async (req, res) => {
  try {
    const { mentorId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    // Verify mentor exists
    const mentorDoc = await db.collection('users').doc(mentorId).get();
    
    if (!mentorDoc.exists || mentorDoc.data().role !== 'mentor') {
      return res.status(404).json({ error: 'Mentor not found' });
    }

    const ratingsQuery = db.collection('ratings')
      .where('mentorId', '==', mentorId)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    const ratingsSnapshot = await ratingsQuery.get();
    const ratings = [];
    let totalRating = 0;

    ratingsSnapshot.forEach(doc => {
      const ratingData = doc.data();
      totalRating += ratingData.rating;
      
      ratings.push({
        id: doc.id,
        ...ratingData
      });
    });

    // Calculate average rating
    const averageRating = ratings.length > 0 ? (totalRating / ratings.length).toFixed(1) : 0;

    // Get total count of ratings
    const totalRatingsSnapshot = await db.collection('ratings')
      .where('mentorId', '==', mentorId)
      .get();

    res.json({
      ratings,
      averageRating: parseFloat(averageRating),
      totalRatings: totalRatingsSnapshot.size,
      hasMore: ratingsSnapshot.size === parseInt(limit)
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({
      error: 'Failed to get ratings',
      message: error.message
    });
  }
});

// Get rating statistics for a mentor
router.get('/:mentorId/stats', async (req, res) => {
  try {
    const { mentorId } = req.params;

    // Verify mentor exists
    const mentorDoc = await db.collection('users').doc(mentorId).get();
    
    if (!mentorDoc.exists || mentorDoc.data().role !== 'mentor') {
      return res.status(404).json({ error: 'Mentor not found' });
    }

    const ratingsSnapshot = await db.collection('ratings')
      .where('mentorId', '==', mentorId)
      .get();

    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    ratingsSnapshot.forEach(doc => {
      const rating = doc.data().rating;
      ratingCounts[rating]++;
      totalRating += rating;
    });

    const totalRatings = ratingsSnapshot.size;
    const averageRating = totalRatings > 0 ? (totalRating / totalRatings).toFixed(1) : 0;

    res.json({
      averageRating: parseFloat(averageRating),
      totalRatings,
      ratingDistribution: ratingCounts
    });
  } catch (error) {
    console.error('Get rating stats error:', error);
    res.status(500).json({
      error: 'Failed to get rating statistics',
      message: error.message
    });
  }
});

module.exports = router;