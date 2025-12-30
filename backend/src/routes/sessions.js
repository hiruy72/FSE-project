const express = require('express');
const { db } = require('../config/firebase');
const { authenticateToken, requireRole } = require('../middlewares/auth');

const router = express.Router();

// Request a mentorship session
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { mentorId, courseId, description, preferredTime } = req.body;

    // Verify mentor exists and is approved
    const mentorDoc = await db.collection('users').doc(mentorId).get();
    if (!mentorDoc.exists || mentorDoc.data().role !== 'mentor' || !mentorDoc.data().approved) {
      return res.status(400).json({ error: 'Invalid or unapproved mentor' });
    }

    const sessionData = {
      menteeId: req.user.uid,
      mentorId,
      courseId,
      description,
      preferredTime: preferredTime ? new Date(preferredTime) : null,
      status: 'requested',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('sessions').add(sessionData);

    res.status(201).json({
      message: 'Session requested successfully',
      session: {
        id: docRef.id,
        ...sessionData
      }
    });
  } catch (error) {
    console.error('Request session error:', error);
    res.status(500).json({
      error: 'Failed to request session',
      message: error.message
    });
  }
});

// Accept a session request (mentor only)
router.post('/:id/accept', authenticateToken, requireRole(['mentor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledTime } = req.body;

    const sessionDoc = await db.collection('sessions').doc(id).get();
    
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessionDoc.data();
    
    // Only the assigned mentor can accept
    if (sessionData.mentorId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized to accept this session' });
    }

    if (sessionData.status !== 'requested') {
      return res.status(400).json({ error: 'Session is not in requested status' });
    }

    const updateData = {
      status: 'active',
      scheduledTime: scheduledTime ? new Date(scheduledTime) : new Date(),
      startedAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('sessions').doc(id).update(updateData);

    res.json({ message: 'Session accepted successfully' });
  } catch (error) {
    console.error('Accept session error:', error);
    res.status(500).json({
      error: 'Failed to accept session',
      message: error.message
    });
  }
});

// End a session
router.post('/:id/end', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { summary } = req.body;

    const sessionDoc = await db.collection('sessions').doc(id).get();
    
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessionDoc.data();
    
    // Only participants can end the session
    if (sessionData.menteeId !== req.user.uid && sessionData.mentorId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized to end this session' });
    }

    if (sessionData.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    const updateData = {
      status: 'completed',
      endedAt: new Date(),
      summary: summary || '',
      updatedAt: new Date()
    };

    await db.collection('sessions').doc(id).update(updateData);

    // Create log entry
    const logData = {
      sessionId: id,
      menteeId: sessionData.menteeId,
      mentorId: sessionData.mentorId,
      courseId: sessionData.courseId,
      duration: Math.floor((new Date() - sessionData.startedAt.toDate()) / 1000 / 60), // in minutes
      date: new Date(),
      createdAt: new Date()
    };

    await db.collection('logs').add(logData);

    res.json({ message: 'Session ended successfully' });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({
      error: 'Failed to end session',
      message: error.message
    });
  }
});

// Get active sessions for user
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Get sessions where user is either mentee or mentor
    const menteeQuery = db.collection('sessions')
      .where('menteeId', '==', userId)
      .where('status', '==', 'active');
    
    const mentorQuery = db.collection('sessions')
      .where('mentorId', '==', userId)
      .where('status', '==', 'active');

    const [menteeSnapshot, mentorSnapshot] = await Promise.all([
      menteeQuery.get(),
      mentorQuery.get()
    ]);

    const sessions = [];

    menteeSnapshot.forEach(doc => {
      sessions.push({
        id: doc.id,
        ...doc.data(),
        userRole: 'mentee'
      });
    });

    mentorSnapshot.forEach(doc => {
      sessions.push({
        id: doc.id,
        ...doc.data(),
        userRole: 'mentor'
      });
    });

    res.json(sessions);
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({
      error: 'Failed to get active sessions',
      message: error.message
    });
  }
});

// Get session logs for user
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { limit = 10, offset = 0 } = req.query;
    
    // Get sessions where user is either mentee or mentor
    const menteeQuery = db.collection('sessions')
      .where('menteeId', '==', userId)
      .where('status', '==', 'completed')
      .orderBy('endedAt', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));
    
    const mentorQuery = db.collection('sessions')
      .where('mentorId', '==', userId)
      .where('status', '==', 'completed')
      .orderBy('endedAt', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    const [menteeSnapshot, mentorSnapshot] = await Promise.all([
      menteeQuery.get(),
      mentorQuery.get()
    ]);

    const sessions = [];

    menteeSnapshot.forEach(doc => {
      sessions.push({
        id: doc.id,
        ...doc.data(),
        userRole: 'mentee'
      });
    });

    mentorSnapshot.forEach(doc => {
      sessions.push({
        id: doc.id,
        ...doc.data(),
        userRole: 'mentor'
      });
    });

    // Sort by endedAt
    sessions.sort((a, b) => b.endedAt.toDate() - a.endedAt.toDate());

    res.json(sessions.slice(0, parseInt(limit)));
  } catch (error) {
    console.error('Get session logs error:', error);
    res.status(500).json({
      error: 'Failed to get session logs',
      message: error.message
    });
  }
});

module.exports = router;