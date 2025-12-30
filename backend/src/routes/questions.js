const express = require('express');
const { db } = require('../config/firebase');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// Create new question
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, courseId, tags, priority } = req.body;

    const questionData = {
      menteeId: req.user.uid,
      title,
      description,
      courseId,
      tags: tags || [],
      priority: priority || 'medium',
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('questions').add(questionData);

    res.status(201).json({
      message: 'Question created successfully',
      question: {
        id: docRef.id,
        ...questionData
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
    const { tag, course, status, menteeId } = req.query;
    
    let query = db.collection('questions');

    if (course) {
      query = query.where('courseId', '==', course);
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    if (menteeId) {
      query = query.where('menteeId', '==', menteeId);
    }

    query = query.orderBy('createdAt', 'desc');

    const questionsSnapshot = await query.get();
    const questions = [];

    questionsSnapshot.forEach(doc => {
      const questionData = doc.data();
      
      // Filter by tag if specified
      if (tag && !questionData.tags.includes(tag)) {
        return;
      }

      questions.push({
        id: doc.id,
        ...questionData
      });
    });

    res.json(questions);
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
    const questionDoc = await db.collection('questions').doc(id).get();
    
    if (!questionDoc.exists) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({
      id: questionDoc.id,
      ...questionDoc.data()
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
    
    // Get the question to check ownership
    const questionDoc = await db.collection('questions').doc(id).get();
    
    if (!questionDoc.exists) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const questionData = questionDoc.data();
    
    // Only the mentee who created the question can update it
    if (questionData.menteeId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized to update this question' });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    // Remove fields that shouldn't be updated
    delete updateData.menteeId;
    delete updateData.createdAt;

    await db.collection('questions').doc(id).update(updateData);

    res.json({ message: 'Question updated successfully' });
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
    const questionDoc = await db.collection('questions').doc(id).get();
    
    if (!questionDoc.exists) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const questionData = questionDoc.data();
    
    // Only the mentee who created the question can delete it
    if (questionData.menteeId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized to delete this question' });
    }

    await db.collection('questions').doc(id).delete();

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      error: 'Failed to delete question',
      message: error.message
    });
  }
});

module.exports = router;