const express = require('express');
const { db } = require('../config/firebase');
const { authenticateToken, requireRole } = require('../middlewares/jwtAuth');

const router = express.Router();

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userDoc = await db.collection('users').doc(id).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    
    // Remove sensitive information
    delete userData.email;
    
    res.json({
      id: userDoc.id,
      ...userData
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: error.message
    });
  }
});

// Update user profile
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Users can only update their own profile or admins can update any
    if (req.user.uid !== id && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to update this profile' });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    // Remove fields that shouldn't be updated directly
    delete updateData.role;
    delete updateData.approved;
    delete updateData.createdAt;

    await db.collection('users').doc(id).update(updateData);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: error.message
    });
  }
});

// Get all mentors
router.get('/', async (req, res) => {
  try {
    const { course, tag, available } = req.query;
    
    let query = db.collection('users')
      .where('role', '==', 'mentor')
      .where('approved', '==', true);

    if (course) {
      query = query.where('profile.courses', 'array-contains', course);
    }

    const mentorsSnapshot = await query.get();
    const mentors = [];

    mentorsSnapshot.forEach(doc => {
      const mentorData = doc.data();
      
      // Filter by tag if specified
      if (tag && !mentorData.profile.skills.includes(tag)) {
        return;
      }

      // Remove sensitive information
      delete mentorData.email;
      
      mentors.push({
        id: doc.id,
        ...mentorData
      });
    });

    res.json(mentors);
  } catch (error) {
    console.error('Get mentors error:', error);
    res.status(500).json({
      error: 'Failed to get mentors',
      message: error.message
    });
  }
});

// Apply to become a mentor
router.post('/mentors/apply', authenticateToken, async (req, res) => {
  try {
    const { skills, courses, bio, availability } = req.body;

    const updateData = {
      role: 'mentor',
      approved: false,
      'profile.skills': skills || [],
      'profile.courses': courses || [],
      'profile.bio': bio || '',
      'profile.availability': availability || [],
      updatedAt: new Date()
    };

    await db.collection('users').doc(req.user.uid).update(updateData);

    res.json({ message: 'Mentor application submitted successfully' });
  } catch (error) {
    console.error('Mentor application error:', error);
    res.status(500).json({
      error: 'Failed to submit mentor application',
      message: error.message
    });
  }
});

module.exports = router;