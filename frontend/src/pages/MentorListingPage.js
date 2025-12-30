import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/DemoAuthContext';
import { userAPI, sessionAPI, courseAPI } from '../services/api';
import { getDemoMentors, getDemoCourses } from '../utils/demoData';
import socketService from '../services/socket';
import { 
  Search, 
  Filter, 
  Star, 
  MapPin, 
  Clock, 
  Users,
  MessageCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const MentorListingPage = () => {
  const { getIdToken } = useAuth();
  const [mentors, setMentors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    course: '',
    tag: '',
    available: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchMentors();
  }, [filters]);

  // Listen for real-time mentor rating updates
  useEffect(() => {
    socketService.connect();
    
    const handleRatingUpdate = (data) => {
      setMentors(prev => prev.map(mentor => 
        mentor.id === data.mentorId 
          ? {
              ...mentor,
              profile: {
                ...mentor.profile,
                averageRating: data.newRating,
                totalRatings: data.totalRatings
              }
            }
          : mentor
      ));
    };

    socketService.onMentorRatingUpdate(handleRatingUpdate);

    return () => {
      socketService.offMentorRatingUpdate(handleRatingUpdate);
    };
  }, []);

  const fetchData = async () => {
    try {
      // Use demo data in development mode
      if (process.env.NODE_ENV === 'development') {
        const demoMentors = getDemoMentors();
        const demoCourses = getDemoCourses();
        
        setMentors(demoMentors);
        setCourses(demoCourses);
        return;
      }

      const [mentorsResponse, coursesResponse] = await Promise.all([
        userAPI.getMentors(),
        courseAPI.getCourses()
      ]);
      
      setMentors(mentorsResponse.data);
      setCourses(coursesResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fallback to demo data on error
      const demoMentors = getDemoMentors();
      const demoCourses = getDemoCourses();
      
      setMentors(demoMentors);
      setCourses(demoCourses);
    } finally {
      setLoading(false);
    }
  };

  const fetchMentors = async () => {
    try {
      const params = {};
      if (filters.course) params.course = filters.course;
      if (filters.tag) params.tag = filters.tag;
      if (filters.available) params.available = true;

      const response = await userAPI.getMentors(params);
      let filteredMentors = response.data;

      // Apply search filter
      if (filters.search) {
        filteredMentors = filteredMentors.filter(mentor =>
          `${mentor.firstName} ${mentor.lastName}`.toLowerCase().includes(filters.search.toLowerCase()) ||
          mentor.profile?.bio?.toLowerCase().includes(filters.search.toLowerCase()) ||
          mentor.profile?.skills?.some(skill => skill.toLowerCase().includes(filters.search.toLowerCase()))
        );
      }

      setMentors(filteredMentors);
    } catch (error) {
      console.error('Error fetching mentors:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const requestSession = async (mentorId) => {
    try {
      const token = await getIdToken();
      await sessionAPI.requestSession({
        mentorId,
        courseId: filters.course || null,
        description: 'Session request from mentor listing'
      }, token);
      
      toast.success('Session request sent successfully!');
    } catch (error) {
      console.error('Error requesting session:', error);
      toast.error('Failed to request session');
    }
  };

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
        <h1 className="text-3xl font-bold text-white mb-2">Find Your Perfect Mentor</h1>
        <p className="text-dark-400">Connect with experienced mentors to accelerate your learning</p>
      </div>

      {/* Filters */}
      <div className="card mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search mentors..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>

          {/* Course Filter */}
          <select
            value={filters.course}
            onChange={(e) => handleFilterChange('course', e.target.value)}
            className="input-field w-full"
          >
            <option value="">All Courses</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>

          {/* Tag Filter */}
          <input
            type="text"
            placeholder="Filter by skill..."
            value={filters.tag}
            onChange={(e) => handleFilterChange('tag', e.target.value)}
            className="input-field w-full"
          />

          {/* Available Filter */}
          <label className="flex items-center space-x-2 text-white">
            <input
              type="checkbox"
              checked={filters.available}
              onChange={(e) => handleFilterChange('available', e.target.checked)}
              className="rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500"
            />
            <span>Available now</span>
          </label>
        </div>
      </div>

      {/* Mentors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mentors.map((mentor) => (
          <div key={mentor.id} className="card hover:bg-dark-700 transition-colors duration-200">
            {/* Mentor Avatar */}
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {mentor.firstName?.[0]}{mentor.lastName?.[0]}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {mentor.firstName} {mentor.lastName}
                </h3>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm text-white">
                    {mentor.profile?.averageRating || '4.8'}
                  </span>
                  <span className="text-sm text-dark-400">
                    ({mentor.profile?.totalRatings || '24'} reviews)
                  </span>
                </div>
              </div>
            </div>

            {/* Bio */}
            <p className="text-dark-300 text-sm mb-4 line-clamp-3">
              {mentor.profile?.bio || 'Experienced mentor ready to help you succeed in your academic journey.'}
            </p>

            {/* Skills */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {mentor.profile?.skills?.slice(0, 3).map((skill, index) => (
                  <span
                    key={index}
                    className="bg-primary-600/20 text-primary-400 px-2 py-1 rounded text-xs"
                  >
                    {skill}
                  </span>
                ))}
                {mentor.profile?.skills?.length > 3 && (
                  <span className="text-dark-400 text-xs">
                    +{mentor.profile.skills.length - 3} more
                  </span>
                )}
              </div>
            </div>

            {/* Courses */}
            <div className="mb-4">
              <p className="text-dark-400 text-xs mb-2">Courses:</p>
              <div className="flex flex-wrap gap-1">
                {mentor.profile?.courses?.slice(0, 2).map((courseId, index) => {
                  const course = courses.find(c => c.id === courseId);
                  return course ? (
                    <span
                      key={index}
                      className="bg-dark-600 text-dark-300 px-2 py-1 rounded text-xs"
                    >
                      {course.name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-sm text-dark-400 mb-4">
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>45 students</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>120 hours</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => requestSession(mentor.id)}
                className="flex-1 btn-primary text-sm py-2"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Request Session
              </button>
              <Link
                to={`/mentors/${mentor.id}`}
                className="btn-secondary text-sm py-2 px-3 text-center"
              >
                View Profile
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {mentors.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No mentors found</h3>
          <p className="text-dark-400 mb-4">
            Try adjusting your filters or search terms
          </p>
          <button
            onClick={() => setFilters({ search: '', course: '', tag: '', available: false })}
            className="btn-primary"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default MentorListingPage;