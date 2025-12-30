const express = require('express');
const { db } = require('../config/firebase');
const { authenticateToken, requireRole } = require('../middlewares/auth');

const router = express.Router();

// Get all courses
router.get('/', async (req, res) => {
  try {
    const coursesSnapshot = await db.collection('courses').orderBy('name').get();
    const courses = [];

    coursesSnapshot.forEach(doc => {
      courses.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      error: 'Failed to get courses',
      message: error.message
    });
  }
});

// Create new course (admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, department, description, tags } = req.body;

    const courseData = {
      name,
      department,
      description: description || '',
      tags: tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('courses').add(courseData);

    res.status(201).json({
      message: 'Course created successfully',
      course: {
        id: docRef.id,
        ...courseData
      }
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      error: 'Failed to create course',
      message: error.message
    });
  }
});

// Update course (admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    delete updateData.createdAt;

    await db.collection('courses').doc(id).update(updateData);

    res.json({ message: 'Course updated successfully' });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      error: 'Failed to update course',
      message: error.message
    });
  }
});

// Delete course (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('courses').doc(id).delete();

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      error: 'Failed to delete course',
      message: error.message
    });
  }
});

module.exports = router;