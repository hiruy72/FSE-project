import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  BookOpen, 
  MessageCircle, 
  Star, 
  ArrowRight,
  CheckCircle,
  Play
} from 'lucide-react';

const LandingPage = () => {
  const features = [
    {
      icon: Users,
      title: 'Peer-to-Peer Learning',
      description: 'Connect with fellow students and experienced mentors'
    },
    {
      icon: BookOpen,
      title: 'Expert Guidance',
      description: 'Get help from top-performing students in your courses'
    },
    {
      icon: MessageCircle,
      title: 'Real-time Support',
      description: 'Instant messaging and live academic assistance'
    }
  ];

  const courses = [
    {
      title: 'React & Next.js Mastery',
      mentor: 'Alex Chen',
      rating: 4.9,
      students: 234,
      image: '/api/placeholder/300/200'
    },
    {
      title: 'Python for Data Science',
      mentor: 'Sarah Johnson',
      rating: 4.8,
      students: 189,
      image: '/api/placeholder/300/200'
    },
    {
      title: 'UI/UX Design',
      mentor: 'Mike Rodriguez',
      rating: 4.9,
      students: 156,
      image: '/api/placeholder/300/200'
    },
    {
      title: 'Cybersecurity Essentials',
      mentor: 'Emily Davis',
      rating: 4.7,
      students: 203,
      image: '/api/placeholder/300/200'
    }
  ];

  const mentors = [
    {
      name: 'Sarah Chen',
      expertise: 'Full Stack Development',
      rating: 4.9,
      sessions: 150,
      image: '/api/placeholder/80/80'
    },
    {
      name: 'Alex Rodriguez',
      expertise: 'Data Science & ML',
      rating: 4.8,
      sessions: 120,
      image: '/api/placeholder/80/80'
    },
    {
      name: 'Jessica Kim',
      expertise: 'Product Design',
      rating: 4.9,
      sessions: 98,
      image: '/api/placeholder/80/80'
    },
    {
      name: 'David Park',
      expertise: 'DevOps & Cloud',
      rating: 4.7,
      sessions: 87,
      image: '/api/placeholder/80/80'
    }
  ];

  const categories = [
    { name: 'Web Development', icon: '💻', color: 'bg-blue-500' },
    { name: 'Data Science', icon: '📊', color: 'bg-green-500' },
    { name: 'Design', icon: '🎨', color: 'bg-purple-500' },
    { name: 'Mobile Dev', icon: '📱', color: 'bg-orange-500' },
    { name: 'AI & ML', icon: '🤖', color: 'bg-red-500' },
    { name: 'Cybersecurity', icon: '🔒', color: 'bg-yellow-500' }
  ];

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Navigation */}
      <nav className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">P</span>
                </div>
                <span className="text-white font-bold text-xl">PeerLearn</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-dark-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-gradient py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Learn Together, <span className="text-primary-500">Grow</span> Together
              </h1>
              <p className="text-xl text-dark-300 mb-8 max-w-2xl">
                Connect with peer mentors, get real-time academic support, and accelerate your learning journey with our collaborative platform.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  to="/register"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200 flex items-center justify-center"
                >
                  Start Learning
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <button className="border border-dark-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-dark-800 transition-colors duration-200 flex items-center justify-center">
                  <Play className="mr-2 w-5 h-5" />
                  Watch Demo
                </button>
              </div>

              <div className="flex items-center justify-center lg:justify-start space-x-8 text-dark-400">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">500+</div>
                  <div className="text-sm">Active Students</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">2.5k+</div>
                  <div className="text-sm">Sessions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">50+</div>
                  <div className="text-sm">Courses</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-dark-800 rounded-2xl p-8 border border-dark-700">
                <img 
                  src="/api/placeholder/500/400" 
                  alt="Students collaborating" 
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Choose PeerLearn?
            </h2>
            <p className="text-xl text-dark-400 max-w-3xl mx-auto">
              Our platform connects you with the best peer mentors and provides real-time academic support
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="bg-primary-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
                  <p className="text-dark-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Featured Courses</h2>
              <p className="text-dark-400">Popular courses from expert mentors</p>
            </div>
            <Link to="/courses" className="text-primary-500 hover:text-primary-400 font-medium flex items-center">
              View All
              <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.map((course, index) => (
              <div key={index} className="bg-dark-800 rounded-lg overflow-hidden border border-dark-700 hover:border-dark-600 transition-colors duration-200">
                <div className="h-48 bg-gradient-to-br from-primary-500 to-primary-700"></div>
                <div className="p-6">
                  <h3 className="font-semibold text-white mb-2">{course.title}</h3>
                  <p className="text-dark-400 text-sm mb-4">by {course.mentor}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-white">{course.rating}</span>
                    </div>
                    <span className="text-sm text-dark-400">{course.students} students</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Mentors */}
      <section className="py-20 bg-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Top Mentors</h2>
            <p className="text-dark-400">Learn from the best students and industry experts</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mentors.map((mentor, index) => (
              <div key={index} className="bg-dark-900 rounded-lg p-6 text-center border border-dark-700">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full mx-auto mb-4"></div>
                <h3 className="font-semibold text-white mb-1">{mentor.name}</h3>
                <p className="text-dark-400 text-sm mb-3">{mentor.expertise}</p>
                <div className="flex items-center justify-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-white">{mentor.rating}</span>
                  </div>
                  <span className="text-dark-400">{mentor.sessions} sessions</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Explore Categories</h2>
            <p className="text-dark-400">Find mentors and courses in your area of interest</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category, index) => (
              <div key={index} className="bg-dark-800 rounded-lg p-6 text-center hover:bg-dark-700 transition-colors duration-200 cursor-pointer border border-dark-700">
                <div className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                  <span className="text-2xl">{category.icon}</span>
                </div>
                <h3 className="font-medium text-white text-sm">{category.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Start Your Learning Journey?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of learners and mentors in our collaborative learning community
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors duration-200"
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-primary-600 transition-colors duration-200"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-800 border-t border-dark-700 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">P</span>
                </div>
                <span className="text-white font-bold text-xl">PeerLearn</span>
              </div>
              <p className="text-dark-400 text-sm">
                Empowering students through peer-to-peer learning and mentorship.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><a href="#" className="hover:text-white">Find Mentors</a></li>
                <li><a href="#" className="hover:text-white">Browse Courses</a></li>
                <li><a href="#" className="hover:text-white">Become a Mentor</a></li>
                <li><a href="#" className="hover:text-white">Community</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Connect</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><a href="#" className="hover:text-white">Twitter</a></li>
                <li><a href="#" className="hover:text-white">LinkedIn</a></li>
                <li><a href="#" className="hover:text-white">Discord</a></li>
                <li><a href="#" className="hover:text-white">GitHub</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-dark-700 mt-8 pt-8 text-center">
            <p className="text-dark-400 text-sm">
              © 2024 PeerLearn. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;