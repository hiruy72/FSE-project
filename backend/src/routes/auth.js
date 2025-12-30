const express = require('express');
const { auth, db } = require('../config/firebase');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// Register user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'mentee' } = req.body;

    // In demo mode, just return success
    if (process.env.NODE_ENV === 'development' && process.env.FIREBASE_PROJECT_ID === 'demo-project') {
      const userData = {
        uid: `demo-${Date.now()}`,
        email,
        firstName,
        lastName,
        role,
        approved: role === 'mentee' ? true : false,
        profile: {
          bio: '',
          skills: [],
          courses: [],
          availability: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return res.status(201).json({
        message: 'User registered successfully (demo mode)',
        user: userData
      });
    }

    // Real Firebase registration
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`
    });

    // Create user document in Firestore
    const userData = {
      email,
      firstName,
      lastName,
      role,
      approved: role === 'mentee' ? true : false,
      profile: {
        bio: '',
        skills: [],
        courses: [],
        availability: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        role,
        approved: userData.approved
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Handle demo mode
    if (req.user.uid.startsWith('demo-')) {
      return res.json({
        uid: req.user.uid,
        email: req.user.email,
        firstName: 'Demo',
        lastName: 'User',
        role: 'mentee',
        approved: true,
        profile: {
          bio: 'Demo user for testing',
          skills: ['JavaScript', 'React'],
          courses: [],
          availability: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    res.json({
      uid: req.user.uid,
      email: req.user.email,
      ...userData
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user data',
      message: error.message
    });
  }
});

// Verify 2FA (placeholder for future implementation)
router.post('/verify-2fa', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    
    // Placeholder for 2FA verification logic
    // This would integrate with Firebase Auth's multi-factor authentication
    
    res.json({ message: '2FA verification successful' });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(400).json({
      error: '2FA verification failed',
      message: error.message
    });
  }
});

module.exports = router;