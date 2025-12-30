const express = require('express');
const { db } = require('../config/firebase');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// Send a message
router.post('/messages', authenticateToken, async (req, res) => {
  try {
    const { sessionId, text } = req.body;

    // Verify user is part of the session
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessionDoc.data();
    
    if (sessionData.menteeId !== req.user.uid && sessionData.mentorId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized to send message in this session' });
    }

    if (sessionData.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    const messageData = {
      sessionId,
      senderId: req.user.uid,
      text,
      timestamp: new Date(),
      createdAt: new Date()
    };

    const docRef = await db.collection('messages').add(messageData);

    // Emit message to session room via Socket.IO
    const io = req.app.get('io');
    io.to(sessionId).emit('receive-message', {
      id: docRef.id,
      ...messageData
    });

    res.status(201).json({
      message: 'Message sent successfully',
      messageData: {
        id: docRef.id,
        ...messageData
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      error: 'Failed to send message',
      message: error.message
    });
  }
});

// Get messages for a session
router.get('/messages/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50, before } = req.query;

    // Verify user is part of the session
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessionDoc.data();
    
    if (sessionData.menteeId !== req.user.uid && sessionData.mentorId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized to view messages in this session' });
    }

    let query = db.collection('messages')
      .where('sessionId', '==', sessionId)
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit));

    if (before) {
      query = query.startAfter(new Date(before));
    }

    const messagesSnapshot = await query.get();
    const messages = [];

    messagesSnapshot.forEach(doc => {
      messages.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Reverse to get chronological order
    messages.reverse();

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      error: 'Failed to get messages',
      message: error.message
    });
  }
});

// Mark messages as read (placeholder for future implementation)
router.post('/messages/:sessionId/read', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Verify user is part of the session
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessionDoc.data();
    
    if (sessionData.menteeId !== req.user.uid && sessionData.mentorId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Placeholder for read receipt logic
    // This would update a read status for messages
    
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark messages read error:', error);
    res.status(500).json({
      error: 'Failed to mark messages as read',
      message: error.message
    });
  }
});

module.exports = router;