const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middlewares/jwtAuth');
const { upload, getFileTypeCategory, formatFileSize } = require('../utils/fileUpload');
const path = require('path');

const router = express.Router();

// Send a message
router.post('/messages', authenticateToken, async (req, res) => {
  try {
    const { sessionId, text } = req.body;

    // Verify user is part of the session
    const sessions = await query(
      'SELECT mentee_id, mentor_id, status FROM sessions WHERE id = $1',
      [sessionId]
    );
    
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessions[0];
    
    if (sessionData.mentee_id !== req.user.uid && sessionData.mentor_id !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized to send message in this session' });
    }

    if (sessionData.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Validate that we have either text or it's a file upload
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const messageData = await query(`
      INSERT INTO messages (session_id, sender_id, text, message_type)
      VALUES ($1, $2, $3, $4)
      RETURNING id, session_id, sender_id, text, message_type, file_url, file_name, file_size, file_type, timestamp, created_at
    `, [sessionId, req.user.uid, text, 'text']);

    const message = messageData[0];

    // Emit message to session room via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(sessionId).emit('receive-message', {
        id: message.id,
        sessionId: message.session_id,
        senderId: message.sender_id,
        text: message.text,
        messageType: message.message_type,
        fileUrl: message.file_url,
        fileName: message.file_name,
        fileSize: message.file_size,
        fileType: message.file_type,
        timestamp: message.timestamp,
        createdAt: message.created_at
      });
    }

    res.status(201).json({
      message: 'Message sent successfully',
      messageData: {
        id: message.id,
        sessionId: message.session_id,
        senderId: message.sender_id,
        text: message.text,
        messageType: message.message_type,
        fileUrl: message.file_url,
        fileName: message.file_name,
        fileSize: message.file_size,
        fileType: message.file_type,
        timestamp: message.timestamp,
        createdAt: message.created_at
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

// Upload file and send message
router.post('/messages/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { sessionId, text } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify user is part of the session
    const sessions = await query(
      'SELECT mentee_id, mentor_id, status FROM sessions WHERE id = $1',
      [sessionId]
    );
    
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessions[0];
    
    if (sessionData.mentee_id !== req.user.uid && sessionData.mentor_id !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized to send message in this session' });
    }

    if (sessionData.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Determine message type based on file
    const messageType = getFileTypeCategory(file.mimetype);
    const fileUrl = `/uploads/${file.filename}`;
    
    // Use provided text or empty string for file-only messages
    // Don't auto-generate text like "Shared an image" or filename
    const messageText = text || '';

    const messageData = await query(`
      INSERT INTO messages (session_id, sender_id, text, message_type, file_url, file_name, file_size, file_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, session_id, sender_id, text, message_type, file_url, file_name, file_size, file_type, timestamp, created_at
    `, [
      sessionId, 
      req.user.uid, 
      messageText, 
      messageType, 
      fileUrl, 
      file.originalname, 
      file.size, 
      file.mimetype
    ]);

    const message = messageData[0];

    // Emit message to session room via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(sessionId).emit('receive-message', {
        id: message.id,
        sessionId: message.session_id,
        senderId: message.sender_id,
        text: message.text,
        messageType: message.message_type,
        fileUrl: message.file_url,
        fileName: message.file_name,
        fileSize: message.file_size,
        fileType: message.file_type,
        timestamp: message.timestamp,
        createdAt: message.created_at
      });
    }

    res.status(201).json({
      message: 'File uploaded and message sent successfully',
      messageData: {
        id: message.id,
        sessionId: message.session_id,
        senderId: message.sender_id,
        text: message.text,
        messageType: message.message_type,
        fileUrl: message.file_url,
        fileName: message.file_name,
        fileSize: message.file_size,
        fileType: message.file_type,
        timestamp: message.timestamp,
        createdAt: message.created_at
      }
    });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      error: 'Failed to upload file',
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
    const sessions = await query(
      'SELECT mentee_id, mentor_id, status FROM sessions WHERE id = $1',
      [sessionId]
    );
    
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessions[0];
    
    if (sessionData.mentee_id !== req.user.uid && sessionData.mentor_id !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized to view messages in this session' });
    }

    // Allow access to messages for active, completed, and pending_rating sessions
    if (sessionData.status !== 'active' && sessionData.status !== 'completed' && sessionData.status !== 'pending_rating') {
      return res.status(400).json({ error: 'Session messages not available' });
    }

    let queryText = `
      SELECT 
        m.id,
        m.session_id,
        m.sender_id,
        m.text,
        m.message_type,
        m.file_url,
        m.file_name,
        m.file_size,
        m.file_type,
        m.timestamp,
        m.created_at,
        u.first_name,
        u.last_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.session_id = $1
    `;
    let params = [sessionId];

    if (before) {
      queryText += ' AND m.timestamp < $2';
      params.push(new Date(before));
    }

    queryText += ` ORDER BY m.timestamp DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const messages = await query(queryText, params);

    // Reverse to get chronological order
    const formattedMessages = messages.reverse().map(msg => ({
      id: msg.id,
      sessionId: msg.session_id,
      senderId: msg.sender_id,
      text: msg.text,
      messageType: msg.message_type,
      fileUrl: msg.file_url,
      fileName: msg.file_name,
      fileSize: msg.file_size,
      fileType: msg.file_type,
      timestamp: msg.timestamp,
      createdAt: msg.created_at,
      senderFirstName: msg.first_name,
      senderLastName: msg.last_name
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      error: 'Failed to get messages',
      message: error.message
    });
  }
});

// Mark messages as read
router.post('/messages/:sessionId/read', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Verify user is part of the session
    const sessions = await query(
      'SELECT mentee_id, mentor_id FROM sessions WHERE id = $1',
      [sessionId]
    );
    
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessions[0];
    
    if (sessionData.mentee_id !== req.user.uid && sessionData.mentor_id !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // For now, just return success - read receipts can be implemented later
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark messages read error:', error);
    res.status(500).json({
      error: 'Failed to mark messages as read',
      message: error.message
    });
  }
});

// Serve uploaded files
router.get('/uploads/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);
    
    // Check if file exists
    if (!require('fs').existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.sendFile(filePath);
  } catch (error) {
    console.error('Serve file error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

module.exports = router;