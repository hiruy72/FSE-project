const express = require('express');
const { db } = require('../config/firebase');
const { authenticateToken, requireRole } = require('../middlewares/auth');

const router = express.Router();

// Approve mentor application
router.post('/mentors/:id/approve', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    const userDoc = await db.collection('users').doc(id).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    
    if (userData.role !== 'mentor') {
      return res.status(400).json({ error: 'User is not a mentor applicant' });
    }

    await db.collection('users').doc(id).update({
      approved: approved === true,
      updatedAt: new Date()
    });

    res.json({ 
      message: `Mentor ${approved ? 'approved' : 'rejected'} successfully` 
    });
  } catch (error) {
    console.error('Approve mentor error:', error);
    res.status(500).json({
      error: 'Failed to update mentor approval',
      message: error.message
    });
  }
});

// Get pending mentor applications
router.get('/mentors/pending', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const pendingMentorsSnapshot = await db.collection('users')
      .where('role', '==', 'mentor')
      .where('approved', '==', false)
      .orderBy('createdAt', 'desc')
      .get();

    const pendingMentors = [];

    pendingMentorsSnapshot.forEach(doc => {
      const mentorData = doc.data();
      pendingMentors.push({
        id: doc.id,
        ...mentorData
      });
    });

    res.json(pendingMentors);
  } catch (error) {
    console.error('Get pending mentors error:', error);
    res.status(500).json({
      error: 'Failed to get pending mentors',
      message: error.message
    });
  }
});

// Get system logs
router.get('/logs', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { limit = 50, offset = 0, startDate, endDate } = req.query;

    let query = db.collection('logs').orderBy('date', 'desc');

    if (startDate) {
      query = query.where('date', '>=', new Date(startDate));
    }

    if (endDate) {
      query = query.where('date', '<=', new Date(endDate));
    }

    query = query.limit(parseInt(limit)).offset(parseInt(offset));

    const logsSnapshot = await query.get();
    const logs = [];

    logsSnapshot.forEach(doc => {
      logs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(logs);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      error: 'Failed to get logs',
      message: error.message
    });
  }
});

// Get system reports
router.get('/reports', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get various statistics
    const [
      totalUsersSnapshot,
      totalMentorsSnapshot,
      totalSessionsSnapshot,
      activeSessionsSnapshot,
      recentLogsSnapshot
    ] = await Promise.all([
      db.collection('users').get(),
      db.collection('users').where('role', '==', 'mentor').where('approved', '==', true).get(),
      db.collection('sessions').where('createdAt', '>=', startDate).get(),
      db.collection('sessions').where('status', '==', 'active').get(),
      db.collection('logs').where('date', '>=', startDate).get()
    ]);

    // Calculate session statistics
    let completedSessions = 0;
    let totalDuration = 0;

    recentLogsSnapshot.forEach(doc => {
      const logData = doc.data();
      completedSessions++;
      totalDuration += logData.duration || 0;
    });

    const averageSessionDuration = completedSessions > 0 ? Math.round(totalDuration / completedSessions) : 0;

    const report = {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      statistics: {
        totalUsers: totalUsersSnapshot.size,
        totalMentors: totalMentorsSnapshot.size,
        totalSessions: totalSessionsSnapshot.size,
        activeSessions: activeSessionsSnapshot.size,
        completedSessions,
        averageSessionDuration // in minutes
      }
    };

    res.json(report);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      error: 'Failed to generate reports',
      message: error.message
    });
  }
});

// Get all users (admin only)
router.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { role, approved, limit = 50, offset = 0 } = req.query;

    let query = db.collection('users');

    if (role) {
      query = query.where('role', '==', role);
    }

    if (approved !== undefined) {
      query = query.where('approved', '==', approved === 'true');
    }

    query = query.orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    const usersSnapshot = await query.get();
    const users = [];

    usersSnapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to get users',
      message: error.message
    });
  }
});

// Update user role or approval status
router.put('/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { role, approved } = req.body;

    const updateData = {
      updatedAt: new Date()
    };

    if (role) {
      updateData.role = role;
    }

    if (approved !== undefined) {
      updateData.approved = approved;
    }

    await db.collection('users').doc(id).update(updateData);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Failed to update user',
      message: error.message
    });
  }
});

module.exports = router;