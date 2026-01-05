const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middlewares/jwtAuth');
const { updateMentorStatistics } = require('../utils/mentorStats');

const router = express.Router();

// Request a mentorship session
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { mentorId, courseId, description, preferredTime } = req.body;

    // Verify mentor exists and is approved
    const mentors = await query(
      'SELECT id, role, approved FROM users WHERE id = $1',
      [mentorId]
    );
    
    if (mentors.length === 0 || mentors[0].role !== 'mentor' || !mentors[0].approved) {
      return res.status(400).json({ error: 'Invalid or unapproved mentor' });
    }

    const sessionData = await query(`
      INSERT INTO sessions (mentee_id, mentor_id, course_id, description, preferred_time, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, mentee_id, mentor_id, course_id, description, preferred_time, status, created_at, updated_at
    `, [
      req.user.uid,
      mentorId,
      courseId || null,
      description,
      preferredTime ? new Date(preferredTime) : null,
      'requested'
    ]);

    res.status(201).json({
      message: 'Session requested successfully',
      session: {
        id: sessionData[0].id,
        menteeId: sessionData[0].mentee_id,
        mentorId: sessionData[0].mentor_id,
        courseId: sessionData[0].course_id,
        description: sessionData[0].description,
        preferredTime: sessionData[0].preferred_time,
        status: sessionData[0].status,
        createdAt: sessionData[0].created_at,
        updatedAt: sessionData[0].updated_at
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

    const sessions = await query('SELECT mentor_id, status FROM sessions WHERE id = $1', [id]);
    
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessions[0];
    
    // Only the assigned mentor can accept
    if (sessionData.mentor_id !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized to accept this session' });
    }

    if (sessionData.status !== 'requested') {
      return res.status(400).json({ error: 'Session is not in requested status' });
    }

    await query(`
      UPDATE sessions 
      SET status = 'active', 
          scheduled_time = $1, 
          started_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [scheduledTime ? new Date(scheduledTime) : new Date(), id]);

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

    const sessions = await query(
      'SELECT mentee_id, mentor_id, status, started_at, course_id FROM sessions WHERE id = $1',
      [id]
    );
    
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessions[0];
    
    // Only participants can end the session
    if (sessionData.mentee_id !== req.user.uid && sessionData.mentor_id !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized to end this session' });
    }

    if (sessionData.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Calculate duration in minutes
    const duration = sessionData.started_at ? 
      Math.floor((new Date() - new Date(sessionData.started_at)) / 1000 / 60) : 0;

    // Update session to pending_rating status (not fully completed until rated)
    const newStatus = userData?.role === 'mentee' ? 'pending_rating' : 'completed';
    
    await query(`
      UPDATE sessions 
      SET status = $1, 
          ended_at = CURRENT_TIMESTAMP,
          summary = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [newStatus, summary || '', id]);

    // Create log entry
    await query(`
      INSERT INTO logs (session_id, mentee_id, mentor_id, course_id, duration, date)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [
      id,
      sessionData.mentee_id,
      sessionData.mentor_id,
      sessionData.course_id,
      duration
    ]);

    // Update mentor statistics after session completion
    try {
      await updateMentorStatistics(sessionData.mentor_id);
    } catch (error) {
      console.error('Error updating mentor statistics:', error);
      // Don't fail the session end if statistics update fails
    }

    res.json({ 
      message: 'Session ended successfully',
      duration: duration
    });
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
    
    const sessions = await query(`
      SELECT 
        s.id,
        s.mentee_id,
        s.mentor_id,
        s.course_id,
        s.description,
        s.preferred_time,
        s.scheduled_time,
        s.started_at,
        s.status,
        s.created_at,
        s.updated_at,
        c.name as course_name,
        mentee.first_name as mentee_first_name,
        mentee.last_name as mentee_last_name,
        mentor.first_name as mentor_first_name,
        mentor.last_name as mentor_last_name
      FROM sessions s
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN users mentee ON s.mentee_id = mentee.id
      LEFT JOIN users mentor ON s.mentor_id = mentor.id
      WHERE (s.mentee_id = $1 OR s.mentor_id = $1) AND s.status = 'active'
      ORDER BY s.started_at DESC
    `, [userId]);

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      menteeId: session.mentee_id,
      mentorId: session.mentor_id,
      courseId: session.course_id,
      courseName: session.course_name,
      description: session.description,
      preferredTime: session.preferred_time,
      scheduledTime: session.scheduled_time,
      startedAt: session.started_at,
      status: session.status,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      userRole: session.mentee_id === userId ? 'mentee' : 'mentor',
      otherUser: session.mentee_id === userId ? 
        `${session.mentor_first_name} ${session.mentor_last_name}` :
        `${session.mentee_first_name} ${session.mentee_last_name}`
    }));

    res.json(formattedSessions);
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({
      error: 'Failed to get active sessions',
      message: error.message
    });
  }
});

// Get session history for user (enhanced version with filtering and search)
router.get('/history/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      limit = 20, 
      offset = 0, 
      mentorName, 
      course, 
      dateFrom, 
      dateTo,
      search 
    } = req.query;

    // Verify user can access this history (only their own or admin)
    if (req.user.uid !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to access this session history' });
    }
    
    let queryText = `
      SELECT 
        s.id,
        s.mentee_id,
        s.mentor_id,
        s.course_id,
        s.description,
        s.started_at,
        s.ended_at,
        s.summary,
        s.status,
        s.created_at,
        c.name as course_name,
        mentee.first_name as mentee_first_name,
        mentee.last_name as mentee_last_name,
        mentor.first_name as mentor_first_name,
        mentor.last_name as mentor_last_name,
        l.duration,
        r.rating,
        r.feedback as rating_feedback
      FROM sessions s
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN users mentee ON s.mentee_id = mentee.id
      LEFT JOIN users mentor ON s.mentor_id = mentor.id
      LEFT JOIN logs l ON s.id = l.session_id
      LEFT JOIN ratings r ON s.id = r.session_id
      WHERE (s.mentee_id = $1 OR s.mentor_id = $1) AND s.status IN ('completed', 'pending_rating')
    `;
    
    let params = [userId];
    let paramCount = 1;

    // Add filtering conditions
    if (mentorName) {
      paramCount++;
      queryText += ` AND (mentor.first_name ILIKE $${paramCount} OR mentor.last_name ILIKE $${paramCount})`;
      params.push(`%${mentorName}%`);
    }

    if (course) {
      paramCount++;
      queryText += ` AND c.name ILIKE $${paramCount}`;
      params.push(`%${course}%`);
    }

    if (dateFrom) {
      paramCount++;
      queryText += ` AND s.ended_at >= $${paramCount}`;
      params.push(new Date(dateFrom));
    }

    if (dateTo) {
      paramCount++;
      queryText += ` AND s.ended_at <= $${paramCount}`;
      params.push(new Date(dateTo));
    }

    if (search) {
      paramCount++;
      queryText += ` AND (s.description ILIKE $${paramCount} OR s.summary ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    queryText += ` ORDER BY s.ended_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const sessions = await query(queryText, params);

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      menteeId: session.mentee_id,
      mentorId: session.mentor_id,
      courseId: session.course_id,
      courseName: session.course_name,
      description: session.description,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      summary: session.summary,
      status: session.status,
      createdAt: session.created_at,
      duration: session.duration,
      rating: session.rating,
      ratingFeedback: session.rating_feedback,
      userRole: session.mentee_id === userId ? 'mentee' : 'mentor',
      mentorName: `${session.mentor_first_name} ${session.mentor_last_name}`,
      menteeName: `${session.mentee_first_name} ${session.mentee_last_name}`,
      otherUser: session.mentee_id === userId ? 
        `${session.mentor_first_name} ${session.mentor_last_name}` :
        `${session.mentee_first_name} ${session.mentee_last_name}`
    }));

    res.json({
      sessions: formattedSessions,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: formattedSessions.length
      }
    });
  } catch (error) {
    console.error('Get session history error:', error);
    res.status(500).json({
      error: 'Failed to get session history',
      message: error.message
    });
  }
});

// Get session logs for user (legacy endpoint - kept for backward compatibility)
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { limit = 10, offset = 0 } = req.query;
    
    const sessions = await query(`
      SELECT 
        s.id,
        s.mentee_id,
        s.mentor_id,
        s.course_id,
        s.description,
        s.started_at,
        s.ended_at,
        s.summary,
        s.status,
        s.created_at,
        c.name as course_name,
        mentee.first_name as mentee_first_name,
        mentee.last_name as mentee_last_name,
        mentor.first_name as mentor_first_name,
        mentor.last_name as mentor_last_name,
        l.duration
      FROM sessions s
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN users mentee ON s.mentee_id = mentee.id
      LEFT JOIN users mentor ON s.mentor_id = mentor.id
      LEFT JOIN logs l ON s.id = l.session_id
      WHERE (s.mentee_id = $1 OR s.mentor_id = $1) AND s.status IN ('completed', 'pending_rating')
      ORDER BY s.ended_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      menteeId: session.mentee_id,
      mentorId: session.mentor_id,
      courseId: session.course_id,
      courseName: session.course_name,
      description: session.description,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      summary: session.summary,
      status: session.status,
      createdAt: session.created_at,
      duration: session.duration,
      userRole: session.mentee_id === userId ? 'mentee' : 'mentor',
      otherUser: session.mentee_id === userId ? 
        `${session.mentor_first_name} ${session.mentor_last_name}` :
        `${session.mentee_first_name} ${session.mentee_last_name}`
    }));

    res.json(formattedSessions);
  } catch (error) {
    console.error('Get session logs error:', error);
    res.status(500).json({
      error: 'Failed to get session logs',
      message: error.message
    });
  }
});

// Get detailed messages for a specific session (session transcript)
router.get('/:sessionId/messages', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 100, search } = req.query;

    // Verify user is part of the session and session is completed
    const sessions = await query(
      'SELECT mentee_id, mentor_id, status, started_at, ended_at FROM sessions WHERE id = $1',
      [sessionId]
    );
    
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessions[0];
    
    if (sessionData.mentee_id !== req.user.uid && sessionData.mentor_id !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized to view messages in this session' });
    }

    // Allow access to messages for completed sessions or active sessions
    if (sessionData.status !== 'completed' && sessionData.status !== 'active') {
      return res.status(400).json({ error: 'Session messages not available' });
    }

    let queryText = `
      SELECT 
        m.id,
        m.session_id,
        m.sender_id,
        m.text,
        m.timestamp,
        m.created_at,
        u.first_name,
        u.last_name,
        u.role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.session_id = $1
    `;
    let params = [sessionId];

    // Add search functionality across message content
    if (search) {
      queryText += ' AND m.text ILIKE $2';
      params.push(`%${search}%`);
    }

    queryText += ` ORDER BY m.timestamp ASC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const messages = await query(queryText, params);

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      sessionId: msg.session_id,
      senderId: msg.sender_id,
      text: msg.text,
      timestamp: msg.timestamp,
      createdAt: msg.created_at,
      senderFirstName: msg.first_name,
      senderLastName: msg.last_name,
      senderRole: msg.role,
      senderName: `${msg.first_name} ${msg.last_name}`
    }));

    res.json({
      sessionId: sessionId,
      sessionStatus: sessionData.status,
      sessionStartedAt: sessionData.started_at,
      sessionEndedAt: sessionData.ended_at,
      messages: formattedMessages,
      messageCount: formattedMessages.length
    });
  } catch (error) {
    console.error('Get session messages error:', error);
    res.status(500).json({
      error: 'Failed to get session messages',
      message: error.message
    });
  }
});

// Search across all session transcripts for a user
router.get('/search/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { query: searchQuery, limit = 50, offset = 0 } = req.query;

    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchResults = await query(`
      SELECT 
        m.id,
        m.session_id,
        m.sender_id,
        m.text,
        m.timestamp,
        m.created_at,
        u.first_name,
        u.last_name,
        u.role,
        s.description as session_description,
        s.ended_at as session_ended_at,
        c.name as course_name,
        other_user.first_name as other_user_first_name,
        other_user.last_name as other_user_last_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      JOIN sessions s ON m.session_id = s.id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN users other_user ON (
        CASE 
          WHEN s.mentee_id = $1 THEN s.mentor_id = other_user.id
          ELSE s.mentee_id = other_user.id
        END
      )
      WHERE (s.mentee_id = $1 OR s.mentor_id = $1) 
        AND s.status IN ('completed', 'pending_rating')
        AND m.text ILIKE $2
      ORDER BY m.timestamp DESC
      LIMIT $3 OFFSET $4
    `, [userId, `%${searchQuery}%`, parseInt(limit), parseInt(offset)]);

    const formattedResults = searchResults.map(result => ({
      messageId: result.id,
      sessionId: result.session_id,
      senderId: result.sender_id,
      text: result.text,
      timestamp: result.timestamp,
      createdAt: result.created_at,
      senderName: `${result.first_name} ${result.last_name}`,
      senderRole: result.role,
      sessionDescription: result.session_description,
      sessionEndedAt: result.session_ended_at,
      courseName: result.course_name,
      otherUserName: `${result.other_user_first_name} ${result.other_user_last_name}`
    }));

    res.json({
      searchQuery: searchQuery,
      results: formattedResults,
      resultCount: formattedResults.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      error: 'Failed to search messages',
      message: error.message
    });
  }
});

// Get pending session requests for mentor
router.get('/pending', authenticateToken, requireRole(['mentor']), async (req, res) => {
  try {
    const mentorId = req.user.uid;
    
    const sessions = await query(`
      SELECT 
        s.id,
        s.mentee_id,
        s.course_id,
        s.description,
        s.preferred_time,
        s.status,
        s.created_at,
        c.name as course_name,
        mentee.first_name as mentee_first_name,
        mentee.last_name as mentee_last_name
      FROM sessions s
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN users mentee ON s.mentee_id = mentee.id
      WHERE s.mentor_id = $1 AND s.status = 'requested'
      ORDER BY s.created_at DESC
    `, [mentorId]);

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      menteeId: session.mentee_id,
      courseId: session.course_id,
      courseName: session.course_name,
      description: session.description,
      preferredTime: session.preferred_time,
      status: session.status,
      createdAt: session.created_at,
      menteeName: `${session.mentee_first_name} ${session.mentee_last_name}`
    }));

    res.json(formattedSessions);
  } catch (error) {
    console.error('Get pending sessions error:', error);
    res.status(500).json({
      error: 'Failed to get pending sessions',
      message: error.message
    });
  }
});

module.exports = router;