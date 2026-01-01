const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middlewares/jwtAuth');

const router = express.Router();

// Create new question
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, courseId, tags, priority } = req.body;

    const questionData = await query(`
      INSERT INTO questions (mentee_id, title, description, course_id, tags, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, mentee_id, title, description, course_id, tags, priority, status, created_at, updated_at
    `, [
      req.user.uid,
      title,
      description,
      courseId || null,
      tags || [],
      priority || 'medium',
      'open'
    ]);

    res.status(201).json({
      message: 'Question created successfully',
      question: {
        id: questionData[0].id,
        menteeId: questionData[0].mentee_id,
        title: questionData[0].title,
        description: questionData[0].description,
        courseId: questionData[0].course_id,
        tags: questionData[0].tags,
        priority: questionData[0].priority,
        status: questionData[0].status,
        createdAt: questionData[0].created_at,
        updatedAt: questionData[0].updated_at
      }
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({
      error: 'Failed to create question',
      message: error.message
    });
  }
});

// Get questions with filters
router.get('/', async (req, res) => {
  try {
    const { tag, course, status, menteeId, limit = 20, offset = 0 } = req.query;
    
    let whereConditions = [];
    let params = [];
    let paramCount = 0;

    if (course) {
      paramCount++;
      whereConditions.push(`course_id = $${paramCount}`);
      params.push(course);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (menteeId) {
      paramCount++;
      whereConditions.push(`mentee_id = $${paramCount}`);
      params.push(menteeId);
    }

    if (tag) {
      paramCount++;
      whereConditions.push(`$${paramCount} = ANY(tags)`);
      params.push(tag);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    paramCount++;
    const limitParam = paramCount;
    params.push(parseInt(limit));
    
    paramCount++;
    const offsetParam = paramCount;
    params.push(parseInt(offset));

    const questions = await query(`
      SELECT 
        q.id,
        q.mentee_id,
        q.title,
        q.description,
        q.course_id,
        q.tags,
        q.priority,
        q.status,
        q.created_at,
        q.updated_at,
        u.first_name,
        u.last_name,
        c.name as course_name
      FROM questions q
      LEFT JOIN users u ON q.mentee_id = u.id
      LEFT JOIN courses c ON q.course_id = c.id
      ${whereClause}
      ORDER BY q.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `, params);

    const formattedQuestions = questions.map(q => ({
      id: q.id,
      menteeId: q.mentee_id,
      title: q.title,
      description: q.description,
      courseId: q.course_id,
      courseName: q.course_name,
      tags: q.tags || [],
      priority: q.priority,
      status: q.status,
      createdAt: q.created_at,
      updatedAt: q.updated_at,
      menteeFirstName: q.first_name,
      menteeLastName: q.last_name
    }));

    res.json(formattedQuestions);
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      error: 'Failed to get questions',
      message: error.message
    });
  }
});

// Get question by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const questions = await query(`
      SELECT 
        q.id,
        q.mentee_id,
        q.title,
        q.description,
        q.course_id,
        q.tags,
        q.priority,
        q.status,
        q.created_at,
        q.updated_at,
        u.first_name,
        u.last_name,
        c.name as course_name
      FROM questions q
      LEFT JOIN users u ON q.mentee_id = u.id
      LEFT JOIN courses c ON q.course_id = c.id
      WHERE q.id = $1
    `, [id]);
    
    if (questions.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const q = questions[0];
    res.json({
      id: q.id,
      menteeId: q.mentee_id,
      title: q.title,
      description: q.description,
      courseId: q.course_id,
      courseName: q.course_name,
      tags: q.tags || [],
      priority: q.priority,
      status: q.status,
      createdAt: q.created_at,
      updatedAt: q.updated_at,
      menteeFirstName: q.first_name,
      menteeLastName: q.last_name
    });
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({
      error: 'Failed to get question',
      message: error.message
    });
  }
});

// Update question
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, courseId, tags, priority, status } = req.body;
    
    // Get the question to check ownership
    const questions = await query('SELECT mentee_id FROM questions WHERE id = $1', [id]);
    
    if (questions.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Only the mentee who created the question can update it
    if (questions[0].mentee_id !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized to update this question' });
    }

    const updatedQuestions = await query(`
      UPDATE questions 
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        course_id = COALESCE($3, course_id),
        tags = COALESCE($4, tags),
        priority = COALESCE($5, priority),
        status = COALESCE($6, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [title, description, courseId, tags, priority, status, id]);

    res.json({ 
      message: 'Question updated successfully',
      question: updatedQuestions[0]
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({
      error: 'Failed to update question',
      message: error.message
    });
  }
});

// Delete question
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the question to check ownership
    const questions = await query('SELECT mentee_id FROM questions WHERE id = $1', [id]);
    
    if (questions.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Only the mentee who created the question can delete it
    if (questions[0].mentee_id !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized to delete this question' });
    }

    await query('DELETE FROM questions WHERE id = $1', [id]);

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      error: 'Failed to delete question',
      message: error.message
    });
  }
});

// Answer a question (mentor creates a session offer)
router.post('/:id/answer', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { answer, offerSession } = req.body;

    // Verify user is a mentor
    const users = await query('SELECT role FROM users WHERE id = $1', [req.user.uid]);
    if (users.length === 0 || users[0].role !== 'mentor') {
      return res.status(403).json({ error: 'Only mentors can answer questions' });
    }

    // Get the question
    const questions = await query('SELECT mentee_id, title, tags FROM questions WHERE id = $1', [id]);
    
    if (questions.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const question = questions[0];

    // Update question status to answered
    await query(`
      UPDATE questions 
      SET status = 'answered', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    // If mentor offers a session, create a session request
    let sessionId = null;
    if (offerSession) {
      const sessionData = await query(`
        INSERT INTO sessions (mentee_id, mentor_id, description, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [
        question.mentee_id,
        req.user.uid,
        `Session offered for question: ${question.title}`,
        'requested'
      ]);
      sessionId = sessionData[0].id;
    }

    // Store the answer (we can create an answers table or use a simple notification system)
    // For now, let's create a simple notification
    await query(`
      INSERT INTO notifications (user_id, type, title, message, data, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [
      question.mentee_id,
      'question_answered',
      'Your question was answered!',
      answer,
      JSON.stringify({ 
        questionId: id, 
        mentorId: req.user.uid,
        sessionId: sessionId,
        offerSession: offerSession 
      })
    ]);

    res.json({
      message: 'Question answered successfully',
      sessionOffered: offerSession,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Answer question error:', error);
    res.status(500).json({
      error: 'Failed to answer question',
      message: error.message
    });
  }
});

// Get questions relevant to a mentor based on their skills
router.get('/for-mentor/:mentorId', async (req, res) => {
  try {
    const { mentorId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    // Get mentor's skills
    const mentors = await query('SELECT skills FROM users WHERE id = $1 AND role = \'mentor\'', [mentorId]);
    
    if (mentors.length === 0) {
      return res.status(404).json({ error: 'Mentor not found' });
    }
    
    const mentorSkills = mentors[0].skills || [];
    
    if (mentorSkills.length === 0) {
      return res.json([]); // No skills, no relevant questions
    }
    
    // Find questions that have tags matching mentor's skills
    const questions = await query(`
      SELECT 
        q.id,
        q.mentee_id,
        q.title,
        q.description,
        q.course_id,
        q.tags,
        q.priority,
        q.status,
        q.created_at,
        q.updated_at,
        u.first_name,
        u.last_name,
        c.name as course_name,
        -- Calculate match score
        (
          SELECT COUNT(*)
          FROM unnest(q.tags) AS tag
          WHERE tag = ANY($1::text[])
        ) as tag_matches
      FROM questions q
      LEFT JOIN users u ON q.mentee_id = u.id
      LEFT JOIN courses c ON q.course_id = c.id
      WHERE q.status = 'open'
        AND q.tags && $1::text[]  -- Tags overlap with mentor skills
      ORDER BY 
        tag_matches DESC,  -- Most relevant first
        q.priority = 'high' DESC,
        q.priority = 'medium' DESC,
        q.created_at DESC
      LIMIT $2 OFFSET $3
    `, [mentorSkills, parseInt(limit), parseInt(offset)]);

    const formattedQuestions = questions.map(q => ({
      id: q.id,
      menteeId: q.mentee_id,
      title: q.title,
      description: q.description,
      courseId: q.course_id,
      courseName: q.course_name,
      tags: q.tags || [],
      priority: q.priority,
      status: q.status,
      createdAt: q.created_at,
      updatedAt: q.updated_at,
      menteeFirstName: q.first_name,
      menteeLastName: q.last_name,
      tagMatches: parseInt(q.tag_matches),
      relevanceScore: Math.min(100, (parseInt(q.tag_matches) / Math.max(1, q.tags?.length || 1)) * 100)
    }));

    res.json(formattedQuestions);
  } catch (error) {
    console.error('Get mentor questions error:', error);
    res.status(500).json({
      error: 'Failed to get mentor questions',
      message: error.message
    });
  }
});

module.exports = router;