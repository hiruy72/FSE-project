import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/DemoAuthContext';
import { sessionAPI, userAPI, ratingAPI } from '../services/api';
import { 
  Users, 
  BookOpen, 
  MessageCircle, 
  Star, 
  Clock,
  TrendingUp,
  Calendar,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { userData, getIdToken } = useAuth();
  const [activeSessions, setActiveSessions] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    averageRating: 0,
    totalHours: 0,
    activeMentees: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = await getIdToken();
      
      // Fetch active sessions
      const activeSessionsResponse = await sessionAPI.getActiveSessions(token);
      setActiveSessions(activeSessionsResponse.data);

      // Fetch recent sessions
      const recentSessionsResponse = await sessionAPI.getSessionLogs({ limit: 5 }, token);
      setRecentSessions(recentSessionsResponse.data);

      // If user is a mentor, fetch mentor stats
      if (userData?.role === 'mentor') {
        const ratingsResponse = await ratingAPI.getMentorStats(userData.uid);
        setStats(prev => ({
          ...prev,
          averageRating: ratingsResponse.data.averageRating,
          totalSessions: ratingsResponse.data.totalRatings
        }));
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const renderMenteeDashboard = () => (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/mentors"
          className="card hover:bg-dark-700 transition-colors duration-200 cursor-pointer"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-primary-600 p-3 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Find Mentors</h3>
              <p className="text-dark-400 text-sm">Connect with expert mentors</p>
            </div>
          </div>
        </Link>

        <Link
          to="/courses"
          className="card hover:bg-dark-700 transition-colors duration-200 cursor-pointer"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 p-3 rounded-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Browse Courses</h3>
              <p className="text-dark-400 text-sm">Explore available subjects</p>
            </div>
          </div>
        </Link>

        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="bg-green-600 p-3 rounded-lg">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Active Chats</h3>
              <p className="text-dark-400 text-sm">{activeSessions.length} ongoing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-6">Active Sessions</h2>
        {activeSessions.length > 0 ? (
          <div className="space-y-4">
            {activeSessions.map((session) => (
              <div key={session.id} className="bg-dark-700 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Session with Mentor</h3>
                  <p className="text-dark-400 text-sm">Started {new Date(session.startedAt?.toDate()).toLocaleTimeString()}</p>
                </div>
                <Link
                  to={`/chat/${session.id}`}
                  className="btn-primary"
                >
                  Join Chat
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <p className="text-dark-400">No active sessions</p>
            <Link to="/mentors" className="text-primary-500 hover:text-primary-400 text-sm">
              Find a mentor to start learning
            </Link>
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-6">Recent Sessions</h2>
        {recentSessions.length > 0 ? (
          <div className="space-y-4">
            {recentSessions.map((session) => (
              <div key={session.id} className="bg-dark-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">Session Completed</h3>
                  <span className="text-dark-400 text-sm">
                    {new Date(session.endedAt?.toDate()).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-dark-400 text-sm">{session.summary || 'No summary provided'}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <p className="text-dark-400">No recent sessions</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderMentorDashboard = () => (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="bg-primary-600 p-3 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{stats.totalSessions}</h3>
              <p className="text-dark-400 text-sm">Total Sessions</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="bg-yellow-600 p-3 rounded-lg">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{stats.averageRating}</h3>
              <p className="text-dark-400 text-sm">Average Rating</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="bg-green-600 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{activeSessions.length}</h3>
              <p className="text-dark-400 text-sm">Active Sessions</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{stats.totalHours}</h3>
              <p className="text-dark-400 text-sm">Hours Mentored</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-6">Active Mentoring Sessions</h2>
        {activeSessions.length > 0 ? (
          <div className="space-y-4">
            {activeSessions.map((session) => (
              <div key={session.id} className="bg-dark-700 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Session with Student</h3>
                  <p className="text-dark-400 text-sm">Started {new Date(session.startedAt?.toDate()).toLocaleTimeString()}</p>
                </div>
                <Link
                  to={`/chat/${session.id}`}
                  className="btn-primary"
                >
                  Continue Session
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <p className="text-dark-400">No active sessions</p>
            <p className="text-dark-500 text-sm">Students will request sessions with you</p>
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-6">Recent Mentoring Sessions</h2>
        {recentSessions.length > 0 ? (
          <div className="space-y-4">
            {recentSessions.map((session) => (
              <div key={session.id} className="bg-dark-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">Mentoring Session Completed</h3>
                  <span className="text-dark-400 text-sm">
                    {new Date(session.endedAt?.toDate()).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-dark-400 text-sm">{session.summary || 'No summary provided'}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <p className="text-dark-400">No recent sessions</p>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {userData?.firstName}!
        </h1>
        <p className="text-dark-400">
          {userData?.role === 'mentor' 
            ? 'Here\'s your mentoring overview' 
            : 'Continue your learning journey'
          }
        </p>
      </div>

      {/* Role-based Dashboard */}
      {userData?.role === 'mentor' ? renderMentorDashboard() : renderMenteeDashboard()}
    </div>
  );
};

export default DashboardPage;